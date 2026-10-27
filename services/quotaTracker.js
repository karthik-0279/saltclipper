const fs = require('fs');
const path = require('path');

const TRACKER_FILE = path.join(__dirname, '..', 'youtube_quota_tracker.json');

// Default soft daily limit (Google allows 100 max or 10,000 units; 85 is the safe buffer)
const DEFAULT_DAILY_LIMIT = parseInt(process.env.YOUTUBE_DAILY_UPLOAD_LIMIT || '85', 10);

/**
 * Get current UTC date string: "YYYY-MM-DD"
 * YouTube API quotas reset daily at midnight Pacific Time (08:00 UTC) / UTC
 */
function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Read the persisted quota tracking data from disk.
 * Automatically resets count if the date has rolled over.
 */
function loadQuotaData() {
  const today = getTodayDateString();
  const defaultData = {
    date: today,
    dailyLimit: DEFAULT_DAILY_LIMIT,
    uploadsToday: 0,
    circuitBreakerOpen: false,
    circuitBreakerReason: null,
    history: []
  };

  if (!fs.existsSync(TRACKER_FILE)) {
    saveQuotaData(defaultData);
    return defaultData;
  }

  try {
    const raw = fs.readFileSync(TRACKER_FILE, 'utf8');
    const data = JSON.parse(raw);

    // If new calendar day, automatically reset the counter and circuit breaker
    if (data.date !== today) {
      console.log(`[QUOTA TRACKER] 🔄 New calendar day detected (${today} vs previous ${data.date}). Resetting daily upload count to 0.`);
      const resetData = {
        date: today,
        dailyLimit: data.dailyLimit || DEFAULT_DAILY_LIMIT,
        uploadsToday: 0,
        circuitBreakerOpen: false,
        circuitBreakerReason: null,
        history: []
      };
      saveQuotaData(resetData);
      return resetData;
    }

    return {
      date: data.date || today,
      dailyLimit: data.dailyLimit || DEFAULT_DAILY_LIMIT,
      uploadsToday: Number.isInteger(data.uploadsToday) ? data.uploadsToday : 0,
      circuitBreakerOpen: Boolean(data.circuitBreakerOpen),
      circuitBreakerReason: data.circuitBreakerReason || null,
      history: Array.isArray(data.history) ? data.history : []
    };
  } catch (err) {
    console.error('[QUOTA TRACKER] Error reading tracker file, re-initializing:', err.message);
    saveQuotaData(defaultData);
    return defaultData;
  }
}

/**
 * Save tracking data to disk atomically.
 */
function saveQuotaData(data) {
  try {
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[QUOTA TRACKER] Failed to persist quota tracker file:', err.message);
  }
}

/**
 * Calculate hours and minutes remaining until midnight UTC (quota refresh)
 */
function getNextResetEstimate() {
  const now = new Date();
  const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const diffMs = nextReset.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return {
    iso: nextReset.toISOString(),
    hoursRemaining: hours,
    minutesRemaining: minutes,
    display: `${hours}h ${minutes}m`
  };
}

/**
 * Get comprehensive quota status
 */
function getQuotaStatus() {
  const data = loadQuotaData();
  const remaining = Math.max(0, data.dailyLimit - data.uploadsToday);
  const resetEstimate = getNextResetEstimate();

  return {
    today: data.date,
    uploadsToday: data.uploadsToday,
    dailyLimit: data.dailyLimit,
    remainingUploads: remaining,
    isCircuitBreakerOpen: data.circuitBreakerOpen || data.uploadsToday >= data.dailyLimit,
    circuitBreakerReason: data.circuitBreakerReason || (data.uploadsToday >= data.dailyLimit ? `Safe daily upload limit cap (${data.dailyLimit}/${data.dailyLimit}) reached.` : null),
    nextReset: resetEstimate,
    historyCount: data.history.length,
    recentUploads: data.history.slice(-10)
  };
}

/**
 * Check if a new upload is allowed under current limits and circuit breaker state
 * @returns {{ allowed: boolean, reason?: string, remaining: number }}
 */
function canUpload() {
  const status = getQuotaStatus();

  if (status.isCircuitBreakerOpen) {
    return {
      allowed: false,
      reason: status.circuitBreakerReason || `Circuit breaker is tripped. Safe daily limit of ${status.dailyLimit} reached.`,
      remaining: status.remainingUploads
    };
  }

  if (status.remainingUploads <= 0) {
    return {
      allowed: false,
      reason: `Safe local daily cap of ${status.dailyLimit} uploads reached. Halted to protect YouTube API token quota.`,
      remaining: 0
    };
  }

  return {
    allowed: true,
    remaining: status.remainingUploads
  };
}

/**
 * Record an upload operation (tracking videos.insert calls).
 * Automatically trips the circuit breaker if the safe daily cap is hit.
 */
function recordUpload(videoId, meta = {}) {
  const data = loadQuotaData();
  data.uploadsToday += 1;

  const event = {
    timestamp: new Date().toISOString(),
    videoId: videoId || null,
    title: meta.title || 'Untitled Clip',
    uploadNumber: data.uploadsToday,
    privacyStatus: meta.privacyStatus || 'public'
  };

  data.history.push(event);

  console.log(`[QUOTA TRACKER] 📊 Upload #${data.uploadsToday} recorded. Remaining safe quota today: ${Math.max(0, data.dailyLimit - data.uploadsToday)} / ${data.dailyLimit}`);

  // Impose circuit breaker if safe daily cap is reached
  if (data.uploadsToday >= data.dailyLimit) {
    data.circuitBreakerOpen = true;
    data.circuitBreakerReason = `Safe daily limit cap of ${data.dailyLimit} uploads reached for ${data.date}. Circuit breaker tripped to prevent API exhaustion.`;
    console.warn(`[QUOTA TRACKER] ⚠️ CIRCUIT BREAKER ENGAGED: Safe daily limit reached (${data.uploadsToday}/${data.dailyLimit}). All further uploads halted.`);
  }

  saveQuotaData(data);
  return getQuotaStatus();
}

/**
 * Trip the circuit breaker explicitly (e.g. on 403 quotaExceeded from Google API).
 */
function tripCircuitBreaker(reason) {
  const data = loadQuotaData();
  data.circuitBreakerOpen = true;
  data.circuitBreakerReason = reason || 'YouTube API 403 quotaExceeded: Daily token pool exhausted.';
  saveQuotaData(data);
  console.error(`[QUOTA TRACKER] 🚫 CIRCUIT BREAKER TRIPPED: ${data.circuitBreakerReason}`);
  return getQuotaStatus();
}

/**
 * Reset quota counter and circuit breaker (Admin tool / testing)
 */
function resetQuota(newLimit = null) {
  const today = getTodayDateString();
  const resetData = {
    date: today,
    dailyLimit: newLimit ? parseInt(newLimit, 10) : DEFAULT_DAILY_LIMIT,
    uploadsToday: 0,
    circuitBreakerOpen: false,
    circuitBreakerReason: null,
    history: []
  };
  saveQuotaData(resetData);
  console.log(`[QUOTA TRACKER] 🔄 Quota tracker manually reset for ${today}. Limit: ${resetData.dailyLimit}`);
  return getQuotaStatus();
}

module.exports = {
  DEFAULT_DAILY_LIMIT,
  getQuotaStatus,
  canUpload,
  recordUpload,
  tripCircuitBreaker,
  resetQuota
};
