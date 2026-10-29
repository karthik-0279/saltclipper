/**
 * AutoClip AI - Intelligent Multi-Account Queue Worker & Batch Controller
 * 
 * Production Requirements:
 * 1. Supports continuous batch processing for 20+ clips (25, 30, 50+ clips).
 * 2. Intelligent Quota Fallback (Zero Limit Waste):
 *    - Continuously inspects active account quota before each clip.
 *    - If an account hits its daily limit OR triggers a 403 Quota Exceeded error,
 *      it immediately marks that account as EXHAUSTED, rotates to the next available
 *      connected profile in localStorage, and re-attempts the exact same clip instantly.
 * 3. Event-driven architecture with progress, rotation, and completion listeners.
 */

import {
  getYoutubeProfiles,
  getActiveProfile,
  rotateToNextProfile,
  getMultiAccountStats,
  executeUploadWithRotation,
  saveYoutubeProfiles,
  recordRotationLog
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
    this.delayMs = 2500; // 2.5s safe inter-upload delay between clips
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

    this.queue = clips.map((clip, index) => ({
      index,
      part: index + 1,
      clipId: clip.id || clip.clipId || String(index + 1),
      title: clip.title || `Viral Short Part #${index + 1} #Shorts`,
      startSec: clip.startSec ?? clip.start ?? 0,
      endSec: clip.endSec ?? clip.end ?? 65,
      aspect: aspect || '9:16',
      sourceUrl,
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

    const activeAccount = getActiveProfile();

    this.emit('progress', {
      batchId: this.activeBatchId,
      status: 'PROCESSING',
      currentPart: 0,
      totalParts: this.queue.length,
      progress: 2,
      step: `Initializing intelligent multi-account queue for ${this.queue.length} clips via ${activeAccount?.handle || 'Active Account'}...`,
      activeAccount: activeAccount?.handle,
      uploadedClips: [],
      failedClips: []
    });

    // Begin asynchronous queue execution
    this.processNext();
    return this.activeBatchId;
  }

  /**
   * Process next item in the queue sequentially
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

    // 1. Quota Pre-Check on Current Active Profile
    let activeProfile = getActiveProfile();
    if (!activeProfile || activeProfile.usedToday >= activeProfile.dailyLimit) {
      const rot = rotateToNextProfile('Active account quota reached cap — auto-rotating to preserve limits');
      if (rot.rotated) {
        activeProfile = rot.currentProfile;
        this.emit('accountRotate', {
          from: rot.previousProfile?.handle,
          to: rot.currentProfile?.handle,
          reason: rot.message,
          clipTitle: item.title
        });
      } else if (rot.allExhausted) {
        // All accounts exhausted
        this.failBatch('All connected YouTube accounts have reached their daily upload limits. Please add another account or reset daily counters.');
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
      step: `[Part ${partNum}/${totalParts}] Uploading via ${activeProfile.handle} (${activeProfile.usedToday}/${activeProfile.dailyLimit} used)...`,
      activeAccount: activeProfile.handle,
      uploadedClips: [...this.uploadedClips],
      failedClips: [...this.failedClips]
    });

    try {
      item.attempts++;
      item.status = 'UPLOADING';

      // Execute upload through rotation manager
      const uploadRes = await executeUploadWithRotation({
        clipTitle: item.title,
        privacyStatus: item.privacyStatus
      });

      // Upload succeeded!
      item.status = 'COMPLETED';
      item.result = uploadRes;

      const record = {
        part: partNum,
        clipId: item.clipId,
        title: item.title,
        shortsUrl: uploadRes.shortsUrl,
        videoId: uploadRes.videoId,
        accountUsed: uploadRes.accountUsed?.handle || activeProfile.handle,
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
        step: `[Part ${partNum}/${totalParts}] ✅ Published to YouTube Shorts via ${uploadRes.accountUsed?.handle || activeProfile.handle}!`,
        activeAccount: uploadRes.accountUsed?.handle || activeProfile.handle,
        uploadedClips: [...this.uploadedClips],
        failedClips: [...this.failedClips]
      });

      // Move to next clip in queue
      this.currentIndex++;

      // Cooldown delay before next clip
      if (this.currentIndex < totalParts && this.isRunning) {
        await new Promise(r => setTimeout(r, this.delayMs));
      }

      this.processNext();

    } catch (err) {
      console.warn(`[QUEUE WORKER] Error on Part ${partNum}:`, err.message);

      // Intelligent Quota Fallback: Check if 403 or quota exceeded
      const isQuotaError = 
        err.message.includes('403') ||
        err.message.includes('quota') || 
        err.message.includes('quotaExceeded') || 
        err.message.includes('dailyLimitExceeded') ||
        err.message.includes('exhausted');

      if (isQuotaError && item.attempts <= 5) {
        // Mark current profile as EXHAUSTED immediately
        const profiles = getYoutubeProfiles();
        const updated = profiles.map(p => p.id === activeProfile.id ? { ...p, status: 'EXHAUSTED' } : p);
        saveYoutubeProfiles(updated);

        // Instant failover to next profile in rotation
        const rot = rotateToNextProfile(`403 Quota Exceeded on ${activeProfile.handle} — Seamless Intelligent Failover`);
        
        if (rot.rotated) {
          this.emit('accountRotate', {
            from: activeProfile.handle,
            to: rot.currentProfile.handle,
            reason: `403 Quota Hit on ${activeProfile.handle}. Seamlessly switched to ${rot.currentProfile.handle} with zero clip loss!`,
            clipTitle: item.title
          });

          this.emit('progress', {
            batchId: this.activeBatchId,
            status: 'PROCESSING',
            currentPart: partNum,
            totalParts,
            progress: baseProgress + 4,
            step: `⚡ Quota Limit Reached on ${activeProfile.handle}! Instantly switched to ${rot.currentProfile.handle}. Resuming Part ${partNum}...`,
            activeAccount: rot.currentProfile.handle,
            uploadedClips: [...this.uploadedClips],
            failedClips: [...this.failedClips]
          });

          // Wait 1.5s and re-attempt the exact same clip using the new active account
          await new Promise(r => setTimeout(r, 1500));
          return this.processNext();
        } else {
          // All accounts exhausted
          this.failBatch('All configured YouTube accounts in the multi-account pool have exhausted their quotas.');
          return;
        }
      }

      // Non-quota error or exceeded re-attempts
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
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.processNext();
    }
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.emit('progress', {
      batchId: this.activeBatchId,
      status: 'HALTED',
      currentPart: this.currentIndex,
      totalParts: this.queue.length,
      progress: Math.round((this.currentIndex / (this.queue.length || 1)) * 100),
      step: 'Batch queue manually cancelled.',
      uploadedClips: [...this.uploadedClips],
      failedClips: [...this.failedClips]
    });
  }

  failBatch(errorMessage) {
    this.isRunning = false;
    this.emit('progress', {
      batchId: this.activeBatchId,
      status: 'HALTED',
      currentPart: this.currentIndex + 1,
      totalParts: this.queue.length,
      progress: Math.round((this.currentIndex / (this.queue.length || 1)) * 100),
      step: `Batch halted: ${errorMessage}`,
      error: errorMessage,
      uploadedClips: [...this.uploadedClips],
      failedClips: [...this.failedClips]
    });
    this.emit('complete', {
      success: false,
      batchId: this.activeBatchId,
      uploaded: this.uploadedClips.length,
      failed: this.failedClips.length,
      total: this.queue.length,
      reason: errorMessage
    });
  }

  finishBatch() {
    this.isRunning = false;
    const allSuccessful = this.failedClips.length === 0;
    this.emit('progress', {
      batchId: this.activeBatchId,
      status: allSuccessful ? 'COMPLETED' : 'COMPLETED_WITH_WARNINGS',
      currentPart: this.queue.length,
      totalParts: this.queue.length,
      progress: 100,
      step: `Batch Complete! Successfully uploaded ${this.uploadedClips.length} of ${this.queue.length} clips with zero limit waste!`,
      uploadedClips: [...this.uploadedClips],
      failedClips: [...this.failedClips]
    });
    this.emit('complete', {
      success: allSuccessful,
      batchId: this.activeBatchId,
      uploaded: this.uploadedClips.length,
      failed: this.failedClips.length,
      total: this.queue.length
    });
  }

  getStatus() {
    return {
      batchId: this.activeBatchId,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentPart: this.currentIndex + 1,
      totalParts: this.queue.length,
      progress: this.queue.length > 0 ? Math.round((this.currentIndex / this.queue.length) * 100) : 0,
      uploadedCount: this.uploadedClips.length,
      failedCount: this.failedClips.length
    };
  }
}

// Singleton Queue Worker Instance
export const queueWorker = new UploadQueueWorker();
export default queueWorker;
