/**
 * AutoClip AI - Intelligent Multi-Account Queue Worker & Batch Controller
 * 
 * Production Requirements:
 * 1. Strict Sequential Clip-by-Clip Upload Queue:
 *    - Process uploads strictly one by one (NO parallel or bulk uploads).
 *    - Next clip upload is initiated ONLY after the previous clip receives a confirmed 200 OK from YouTube Data API v3.
 *    - Enforces a mandatory 3-second buffer countdown delay between uploads to avoid rate limit spikes.
 * 2. Smart Quota Tracking & Auto-Switching (10,000 Units Limit):
 *    - Tracks quota consumption per project (1 video = 1,600 units, limit = 10,000 units).
 *    - Proactively or on 403/400 errors ("exceeded the number of videos", quotaExceeded), automatically rotates
 *      to the next linked Google Cloud project/account without interrupting the batch.
 * 3. Token Safety & Graceful Expiration:
 *    - Proactively checks token validity and expiration before queue launch.
 */

import {
  getYoutubeProfiles,
  getActiveProfile,
  rotateToNextProfile,
  getMultiAccountStats,
  executeUploadWithRotation,
  saveYoutubeProfiles,
  recordRotationLog,
  checkTokenValidity,
  DAILY_QUOTA_LIMIT_UNITS,
  UPLOAD_COST_UNITS
} from './profileManager';

class UploadQueueWorker {
  constructor() {
    this.queue = [];
    this.currentIndex = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.activeBatchId = null;
    this.listeners = {
      progress: [],
      clipSuccess: [],
      clipError: [],
      accountRotate: [],
      complete: []
    };
    this.delayMs = 3000; // Strict 3-second buffer between uploads
    this.uploadedClips = [];
    this.failedClips = [];
  }

  // Event Subscription
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.warn(`Error in queue worker event ${event}:`, e); }
      });
    }
  }

  /**
   * Start a new batch of 20+ clips
   */
  startBatch({
    clips = [],
    sourceUrl = '',
    aspect = '9:16',
    privacyStatus = 'public',
    batchId = null
  }) {
    if (!Array.isArray(clips) || clips.length === 0) {
      throw new Error('No clips provided for upload queue.');
    }

    // Token Safety: Check validity and expiration before launching queue
    const activeAccount = getActiveProfile();
    const tokenCheck = checkTokenValidity(activeAccount);
    if (!tokenCheck.isValid) {
      const authErr = new Error(tokenCheck.message);
      authErr.isAuthMissing = true;
      authErr.isExpired = tokenCheck.isExpired;
      throw authErr;
    }

    this.queue = clips.map((clip, index) => ({
      index,
      part: index + 1,
      clipId: clip.id || clip.clipId || String(index + 1),
      title: clip.title || `Viral Short Part #${index + 1} #Shorts`,
      startSec: clip.startSec ?? clip.start ?? 0,
      endSec: clip.endSec ?? clip.end ?? 65,
      aspect: aspect || '9:16',
      sourceUrl,
      videoBlob: clip.videoBlob || clip.blob || null,
      privacyStatus: privacyStatus || 'public',
      status: 'PENDING',
      attempts: 0,
      error: null
    }));

    this.currentIndex = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.activeBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.uploadedClips = [];
    this.failedClips = [];

    this.emit('progress', {
      batchId: this.activeBatchId,
      status: 'PROCESSING',
      currentPart: 0,
      totalParts: this.queue.length,
      progress: 2,
      step: `Initializing sequential upload queue for ${this.queue.length} clips via ${activeAccount?.projectName || 'Active Project'}...`,
      activeAccount: activeAccount?.projectName,
      uploadedClips: [],
      failedClips: []
    });

    // Begin strict sequential execution
    this.processNext();
    return this.activeBatchId;
  }

  /**
   * Process next item in the queue strictly one by one (sequential)
   */
  async processNext() {
    if (!this.isRunning || this.isPaused) return;

    if (this.currentIndex >= this.queue.length) {
      this.finishBatch();
      return;
    }

    const item = this.queue[this.currentIndex];
    const totalParts = this.queue.length;
    const partNum = this.currentIndex + 1;

    // 1. Quota Pre-Check on Current Active Profile (10,000 Units Limit)
    let activeProfile = getActiveProfile();
    const isExhausted = !activeProfile || 
      (activeProfile.quotaUnitsUsed + UPLOAD_COST_UNITS > DAILY_QUOTA_LIMIT_UNITS) ||
      (activeProfile.usedToday >= activeProfile.dailyLimit);

    if (isExhausted) {
      const rot = rotateToNextProfile('10,000 Units daily quota reached — auto-rotating to preserve limits');
      if (rot.rotated) {
        activeProfile = rot.currentProfile;
        this.emit('accountRotate', {
          from: rot.previousProfile?.projectName,
          to: rot.currentProfile?.projectName,
          reason: rot.message,
          clipTitle: item.title
        });
      } else if (rot.allExhausted) {
        this.failBatch('All 5 connected Google Cloud Projects have reached their 10,000 units quota limit.');
        return;
      }
    }

    // Emit progress for current item
    const baseProgress = Math.round(((partNum - 1) / totalParts) * 100);
    this.emit('progress', {
      batchId: this.activeBatchId,
      status: 'PROCESSING',
      currentPart: partNum,
      totalParts,
      progress: Math.max(5, baseProgress + 3),
      step: `[Part ${partNum}/${totalParts}] Uploading via ${activeProfile.projectName} (${activeProfile.quotaUnitsUsed || 0}/10,000 Units Used)...`,
      activeAccount: activeProfile.projectName,
      uploadedClips: [...this.uploadedClips],
      failedClips: [...this.failedClips]
    });

    try {
      item.attempts++;
      item.status = 'UPLOADING';

      // 2. Strict Sequential Execution: Await confirmed 200 OK from YouTube API
      const uploadRes = await executeUploadWithRotation({
        clipTitle: item.title,
        videoBlob: item.videoBlob || null,
        privacyStatus: item.privacyStatus
      });

      if (!uploadRes || !uploadRes.videoId) {
        throw new Error('Upload completed without receiving a verified YouTube video ID.');
      }

      // Upload confirmed 200 OK!
      item.status = 'COMPLETED';
      item.result = uploadRes;

      const record = {
        part: partNum,
        clipId: item.clipId,
        title: item.title,
        shortsUrl: uploadRes.shortsUrl,
        videoId: uploadRes.videoId,
        accountUsed: uploadRes.accountUsed?.projectName || activeProfile.projectName,
        rotationNote: uploadRes.rotationNote,
        timestamp: new Date().toLocaleTimeString()
      };

      this.uploadedClips.push(record);
      this.emit('clipSuccess', { clip: item, result: record });

      const doneProgress = Math.round((partNum / totalParts) * 100);
      this.emit('progress', {
        batchId: this.activeBatchId,
        status: 'PROCESSING',
        currentPart: partNum,
        totalParts,
        progress: doneProgress,
        step: `[Part ${partNum}/${totalParts}] 200 OK Received! Published to YouTube Shorts (${uploadRes.videoId}) via ${uploadRes.accountUsed?.projectName || activeProfile.projectName}.`,
        activeAccount: uploadRes.accountUsed?.projectName || activeProfile.projectName,
        uploadedClips: [...this.uploadedClips],
        failedClips: [...this.failedClips]
      });

      // Move to next clip in queue
      this.currentIndex++;

      // 3. Strict 3-Second Rate Limit Buffer Countdown before next clip upload
      if (this.currentIndex < totalParts && this.isRunning) {
        for (let countdown = 3; countdown >= 1; countdown--) {
          this.emit('progress', {
            batchId: this.activeBatchId,
            status: 'PROCESSING',
            currentPart: partNum,
            totalParts,
            progress: doneProgress,
            step: `[Rate Limit Buffer] Waiting ${countdown}s before uploading Clip #${this.currentIndex + 1} of ${totalParts}...`,
            activeAccount: uploadRes.accountUsed?.projectName || activeProfile.projectName,
            uploadedClips: [...this.uploadedClips],
            failedClips: [...this.failedClips]
          });
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // Next upload starts ONLY after previous 200 OK + 3-second buffer
      this.processNext();

    } catch (err) {
      console.warn(`[QUEUE WORKER] Error on Part ${partNum}:`, err.message);

      // Smart Quota Tracking: Catch 400 & 403 quota/upload limit errors
      const isQuotaError = 
        err.status === 400 ||
        err.status === 403 ||
        err.isQuotaExceeded ||
        err.message.includes('403') ||
        err.message.includes('400') ||
        err.message.toLowerCase().includes('exceeded the number of videos') ||
        err.message.toLowerCase().includes('quota') || 
        err.message.toLowerCase().includes('daily limit');

      if (isQuotaError && item.attempts <= 5) {
        // Mark current project as EXHAUSTED (10,000 units filled)
        const profiles = getYoutubeProfiles();
        const updated = profiles.map(p => p.id === activeProfile.id ? { ...p, status: 'EXHAUSTED', quotaUnitsUsed: DAILY_QUOTA_LIMIT_UNITS } : p);
        saveYoutubeProfiles(updated);

        // Instant failover to next project in rotation
        const rot = rotateToNextProfile(`10,000 Units Quota / Limit Hit (400/403) on ${activeProfile.projectName} — Auto-Switch`);
        
        if (rot.rotated) {
          this.emit('accountRotate', {
            from: activeProfile.projectName,
            to: rot.currentProfile.projectName,
            reason: `Quota limit hit on ${activeProfile.projectName}. Seamlessly switched to ${rot.currentProfile.projectName}!`,
            clipTitle: item.title
          });

          this.emit('progress', {
            batchId: this.activeBatchId,
            status: 'PROCESSING',
            currentPart: partNum,
            totalParts,
            progress: baseProgress + 4,
            step: `⚡ Quota Limit Reached on ${activeProfile.projectName}! Auto-switched to ${rot.currentProfile.projectName}. Resuming Clip #${partNum}...`,
            activeAccount: rot.currentProfile.projectName,
            uploadedClips: [...this.uploadedClips],
            failedClips: [...this.failedClips]
          });

          // Buffer 1.5s and re-attempt the exact same clip sequentially with the new project
          await new Promise(r => setTimeout(r, 1500));
          return this.processNext();
        } else {
          this.failBatch('All 5 configured Google Cloud Projects have reached their 10,000 units daily quota.');
          return;
        }
      }

      // Non-quota error or retry limit reached
      item.status = 'FAILED';
      item.error = err.message;

      const failedRecord = {
        part: partNum,
        clipId: item.clipId,
        title: item.title,
        error: err.message
      };
      this.failedClips.push(failedRecord);
      this.emit('clipError', { clip: item, error: err.message });

      this.currentIndex++;
      if (this.currentIndex < totalParts && this.isRunning) {
        await new Promise(r => setTimeout(r, 1500));
      }
      this.processNext();
    }
  }

  pause() {
    this.isPaused = true;
    this.emit('progress', {
      batchId: this.activeBatchId,
      status: 'PAUSED',
      step: 'Batch queue worker paused by user.'
    });
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.emit('progress', {
        batchId: this.activeBatchId,
        status: 'PROCESSING',
        step: 'Batch queue worker resumed.'
      });
      this.processNext();
    }
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.emit('progress', {
      batchId: this.activeBatchId,
      status: 'HALTED',
      step: 'Upload batch queue cancelled.'
    });
  }

  finishBatch() {
    this.isRunning = false;
    const total = this.queue.length;
    const uploaded = this.uploadedClips.length;
    const failed = this.failedClips.length;

    this.emit('progress', {
      batchId: this.activeBatchId,
      status: 'COMPLETED',
      currentPart: total,
      totalParts: total,
      progress: 100,
      step: `🎉 Upload Pipeline Complete! Successfully published ${uploaded} of ${total} clips (${failed} failed).`,
      uploadedClips: [...this.uploadedClips],
      failedClips: [...this.failedClips]
    });

    this.emit('complete', {
      batchId: this.activeBatchId,
      success: true,
      total,
      uploaded,
      failed,
      clips: [...this.uploadedClips]
    });
  }

  failBatch(errorMessage) {
    this.isRunning = false;
    this.emit('progress', {
      batchId: this.activeBatchId,
      status: 'ERROR',
      progress: Math.round((this.currentIndex / (this.queue.length || 1)) * 100),
      step: `🛑 Queue Halted: ${errorMessage}`,
      error: errorMessage,
      uploadedClips: [...this.uploadedClips],
      failedClips: [...this.failedClips]
    });

    this.emit('complete', {
      batchId: this.activeBatchId,
      success: false,
      error: errorMessage,
      total: this.queue.length,
      uploaded: this.uploadedClips.length,
      failed: this.failedClips.length,
      clips: [...this.uploadedClips]
    });
  }
}

export const queueWorker = new UploadQueueWorker();
