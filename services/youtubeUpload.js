const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const quotaTracker = require('./quotaTracker');
require('dotenv').config();

const BASE_DIR = path.resolve(__dirname, '..');
const TOKENS_FILE = path.join(BASE_DIR, 'youtube_tokens.json');
const CONFIG_FILE = path.join(BASE_DIR, 'oauth_config.json');

/**
 * Retrieve OAuth 2.0 Credentials from Environment or Config File
 */
function getCredentials() {
  let clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  let clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  let redirectUri = (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/auth/youtube/callback').trim();

  // If environment variable has a placeholder, clear it so it can fall back to oauth_config.json
  if (clientId.includes('PASTE_YOUR') || clientId.includes('your_google_client') || clientId.startsWith('http')) {
    clientId = '';
  }

  // Fallback to local oauth_config.json if environment variables are not set or invalid
  if ((!clientId || !clientSecret) && fs.existsSync(CONFIG_FILE)) {
    try {
      const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (!clientId && savedConfig.clientId && !savedConfig.clientId.startsWith('http') && !savedConfig.clientId.includes('PASTE_YOUR')) {
        clientId = savedConfig.clientId.trim();
      }
      if (!clientSecret && savedConfig.clientSecret) {
        clientSecret = savedConfig.clientSecret.trim();
      }
      redirectUri = redirectUri || savedConfig.redirectUri || 'http://localhost:8080/api/auth/youtube/callback';
    } catch (e) {
      console.error('[YOUTUBE SERVICE] Error reading oauth_config.json:', e.message);
    }
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Save manual credentials to oauth_config.json
 */
function saveCredentials(clientId, clientSecret, redirectUri) {
  const config = {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: (redirectUri || 'http://localhost:8080/api/auth/youtube/callback').trim()
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  return config;
}

/**
 * Create Google OAuth2 Client with dynamic redirect URI support
 */
function getOAuth2Client(customRedirectUri = null) {
  const { clientId, clientSecret, redirectUri } = getCredentials();
  if (!clientId || !clientSecret) {
    return null;
  }
  const effectiveRedirect = customRedirectUri || redirectUri;
  return new google.auth.OAuth2(clientId, clientSecret, effectiveRedirect);
}

/**
 * Read Stored Tokens
 */
function getStoredTokens() {
  if (fs.existsSync(TOKENS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    } catch (e) {
      console.error('[YOUTUBE SERVICE] Error parsing youtube_tokens.json:', e.message);
    }
  }
  return null;
}

/**
 * Persist Tokens (refresh_token, access_token, etc.)
 */
function saveTokens(newTokens) {
  const existingTokens = getStoredTokens() || {};
  const mergedTokens = Object.assign({}, existingTokens, newTokens);
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(mergedTokens, null, 2), 'utf8');
  console.log('[YOUTUBE SERVICE] Tokens persisted to youtube_tokens.json (has refresh_token:', !!mergedTokens.refresh_token, ')');
  return mergedTokens;
}

/**
 * Generate Authorization URL for Google Consent Screen
 */
function getAuthUrl(customRedirectUri = null) {
  const oauth2Client = getOAuth2Client(customRedirectUri);
  if (!oauth2Client) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Please configure them in .env or via the UI.');
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  });
}

/**
 * Exchange Authorization Code for Tokens and Persist
 */
async function handleAuthCallback(code, customRedirectUri = null) {
  const oauth2Client = getOAuth2Client(customRedirectUri);
  if (!oauth2Client) {
    throw new Error('OAuth2 Client not configured.');
  }

  const { tokens } = await oauth2Client.getToken(code);
  saveTokens(tokens);
  return tokens;
}

/**
 * Disconnect YouTube Account
 */
function disconnectAccount() {
  if (fs.existsSync(TOKENS_FILE)) {
    try {
      fs.unlinkSync(TOKENS_FILE);
      console.log('[YOUTUBE SERVICE] Tokens deleted. Account disconnected.');
    } catch (e) {
      console.error('[YOUTUBE SERVICE] Error deleting tokens:', e.message);
    }
  }
}

/**
 * Get Authenticated YouTube Client
 */
function getAuthenticatedYouTubeClient() {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Missing Google OAuth Credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)');
  }

  const tokens = getStoredTokens();
  if (!tokens || (!tokens.refresh_token && !tokens.access_token)) {
    throw new Error('YouTube is not authenticated. Please connect your YouTube channel first.');
  }

  oauth2Client.setCredentials(tokens);

  // Automatically listen for token refresh events and save new tokens
  oauth2Client.on('tokens', (refreshedTokens) => {
    console.log('[YOUTUBE SERVICE] Token refreshed automatically.');
    saveTokens(refreshedTokens);
  });

  return {
    youtube: google.youtube({ version: 'v3', auth: oauth2Client }),
    oauth2Client
  };
}

/**
 * Check Connection Status & Fetch Channel Details
 */
async function getStatus() {
  const { clientId, clientSecret, redirectUri } = getCredentials();
  const hasCredentials = !!(clientId && clientSecret);
  const tokens = getStoredTokens();
  const isConnected = !!(tokens && (tokens.refresh_token || tokens.access_token));

  let channelInfo = null;

  if (isConnected && hasCredentials) {
    try {
      const { youtube } = getAuthenticatedYouTubeClient();
      const res = await youtube.channels.list({
        part: ['snippet'],
        mine: true
      });

      if (res.data.items && res.data.items.length > 0) {
        const item = res.data.items[0];
        channelInfo = {
          title: item.snippet.title,
          customUrl: item.snippet.customUrl || '',
          thumbnail: item.snippet.thumbnails?.default?.url || ''
        };
      }
    } catch (err) {
      console.warn('[YOUTUBE SERVICE] Could not fetch channel info (token might be refreshing or expired):', err.message);
    }
  }

  return {
    hasCredentials,
    isConnected,
    redirectUri,
    channel: channelInfo
  };
}

/**
 * Format Title for YouTube Shorts (Max 100 characters, ends with #Shorts)
 */
function formatShortsTitle(title) {
  let clean = (title || 'High-Reach Viral Clip').replace(/[\r\n]+/g, ' ').trim();
  
  if (!clean.toLowerCase().includes('#shorts')) {
    if (clean.length > 91) {
      clean = clean.substring(0, 91).trim();
    }
    return `${clean} #Shorts`;
  }

  if (clean.length > 100) {
    return clean.substring(0, 100).trim();
  }
  return clean;
}

/**
 * Upload an MP4 Video File directly to YouTube Shorts
 * 
 * @param {string} videoFilePath - Full absolute path to rendered MP4
 * @param {string} title - Video title
 * @param {string} description - Video description
 * @param {object} options - Optional settings (privacyStatus, tags, categoryId)
 * @returns {Promise<{ videoId: string, shortsUrl: string, watchUrl: string, title: string, privacyStatus: string }>}
 */
/**
 * Upload an MP4 Video File directly to YouTube Shorts with Quota & Circuit Breaker Protection
 * 
 * @param {string} videoFilePath - Full absolute path to rendered MP4
 * @param {string} title - Video title
 * @param {string} description - Video description
 * @param {object} options - Optional settings (privacyStatus, tags, categoryId, deleteAfterUpload)
 * @returns {Promise<{ videoId: string, shortsUrl: string, watchUrl: string, title: string, privacyStatus: string, quotaRemaining: number }>}
 */
async function uploadShort(videoFilePath, title, description = '', options = {}) {
  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Video file does not exist at path: ${videoFilePath}`);
  }

  // 1. Local Quota Counter & Circuit Breaker Check
  const quotaCheck = quotaTracker.canUpload();
  if (!quotaCheck.allowed) {
    const breakerMsg = `[CIRCUIT BREAKER] Upload aborted: ${quotaCheck.reason}`;
    console.warn(`[YOUTUBE SERVICE] ⚠️ ${breakerMsg}`);
    throw new Error(breakerMsg);
  }

  const stat = fs.statSync(videoFilePath);
  console.log(`[YOUTUBE SERVICE] Sizing video for upload: ${videoFilePath} (${stat.size} bytes)`);

  const { youtube } = getAuthenticatedYouTubeClient();

  const finalTitle = formatShortsTitle(title);
  const finalDescription = `${description ? description + '\n\n' : ''}#Shorts #viral #trending #reels\n\nCut & Reframed with AutoClip AI.`.trim();
  const privacyStatus = options.privacyStatus || 'public'; // Default public
  const categoryId = options.categoryId || '22'; // 22 = People & Blogs

  console.log(`[YOUTUBE SERVICE] Uploading to YouTube Shorts...`);
  console.log(`[YOUTUBE SERVICE] Title: "${finalTitle}"`);
  console.log(`[YOUTUBE SERVICE] Privacy: ${privacyStatus}`);

  const fileStream = fs.createReadStream(videoFilePath);

  let res;
  try {
    res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: finalTitle,
          description: finalDescription,
          categoryId: categoryId,
          tags: options.tags || ['Shorts', 'viral', 'clips', 'trending', 'reels', 'ai']
        },
        status: {
          privacyStatus: options.scheduleTime ? 'private' : privacyStatus,
          publishAt: options.scheduleTime ? new Date(options.scheduleTime).toISOString() : undefined,
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fileStream
      }
    });
  } catch (apiError) {
    // Clean up file stream on error
    if (fileStream && !fileStream.destroyed) {
      fileStream.destroy();
    }

    // 4. Specifically catch 403 quotaExceeded
    const isQuotaExceeded = apiError.code === 403 || 
      apiError.status === 403 || 
      (apiError.errors && apiError.errors.some(e => e.reason === 'quotaExceeded' || e.reason === 'dailyLimitExceeded')) ||
      (apiError.message && (apiError.message.includes('quotaExceeded') || apiError.message.includes('dailyLimitExceeded') || apiError.message.includes('quota')));

    if (isQuotaExceeded) {
      console.error(`\n🚫 [YOUTUBE SERVICE CRITICAL] 403 quotaExceeded detected! YouTube token pool exhausted.`);
      quotaTracker.tripCircuitBreaker('Google API 403 quotaExceeded: Daily token pool exhausted.');
    }

    throw apiError;
  } finally {
    // Guarantee file stream is closed so OS lock is released
    if (fileStream && !fileStream.destroyed) {
      fileStream.destroy();
    }
  }

  const videoId = res.data.id;
  const shortsUrl = `https://www.youtube.com/shorts/${videoId}`;
  const watchUrl = `https://youtu.be/${videoId}`;

  console.log(`[YOUTUBE SERVICE] UPLOAD SUCCESS! 🎉 Video ID: ${videoId}`);
  console.log(`[YOUTUBE SERVICE] Shorts URL: ${shortsUrl}`);

  // 1. Record successful operation in local quota tracker
  const updatedQuota = quotaTracker.recordUpload(videoId, { title: finalTitle, privacyStatus });

  // 3. Immediate local file cleanup (Fixing the download/duplicate bug)
  const shouldDelete = options.deleteAfterUpload !== false;
  if (shouldDelete && fs.existsSync(videoFilePath)) {
    try {
      fs.unlinkSync(videoFilePath);
      console.log(`[YOUTUBE SERVICE] 🗑️ [CLEANUP] Deleted local file immediately after upload: ${videoFilePath}`);
    } catch (e) {
      console.warn(`[YOUTUBE SERVICE] ⚠️ Could not unlink ${videoFilePath}:`, e.message);
    }
  }

  return {
    videoId,
    shortsUrl,
    watchUrl,
    title: finalTitle,
    privacyStatus: res.data.status?.privacyStatus || privacyStatus,
    quotaRemaining: updatedQuota.remainingUploads
  };
}

/**
 * Bulletproof Sequential YouTube Shorts Uploader with Local Quota Tracking & Circuit Breaker
 * 
 * 1. Local Quota Counter & Circuit Breaker:
 *    - Tracks videos.insert operations against a safe local daily cap (default 85 uploads)
 *    - Stops before hitting Google's hard 100 limit, logging clear warnings
 * 2. Strict Sequential Uploads & Delay:
 *    - Strict for...of loop with await so each upload completely finishes before the next
 *    - 10-to-15 second cooldown delay (default 12s) between consecutive uploads
 * 3. Immediate Local File Cleanup:
 *    - Unlinks local video file (fs.unlinkSync) immediately after uploadResponse.data.id
 * 4. Error Handling & Quota Catch:
 *    - Specifically catches 403 quotaExceeded, instantly aborts batch queue, trips breaker, and alerts
 * 
 * @param {Array<string|object>} clipsArray - Array of video file paths or clip objects
 * @param {object} [options] - Optional configurations (privacyStatus, delayMs, youtubeClient, onProgress, onQuotaWarning, onQuotaExceeded)
 * @returns {Promise<{ total: number, uploadedCount: number, halted: boolean, reason: string|null, circuitBreakerOpen: boolean, uploadedClips: Array, failedClips: Array }>}
 */
async function processAndUploadAllClips(clipsArray, options = {}) {
  const youtube = options.youtubeClient || getAuthenticatedYouTubeClient().youtube;
  const totalParts = clipsArray.length;
  let partCount = 1;
  const uploadedResults = [];
  const failedResults = [];
  let haltedReason = null;
  const delayMs = options.delayMs || 12000; // 12-second delay (10-to-15 second range)

  console.log(`\n=======================================================`);
  console.log(`🚀 Starting Protected Sequential Upload Series: ${totalParts} Total Clips`);
  console.log(`⏱️ Inter-upload delay: ${delayMs / 1000}s`);
  const initialQuota = quotaTracker.getQuotaStatus();
  console.log(`📊 Local Quota Status: ${initialQuota.uploadsToday}/${initialQuota.dailyLimit} Used (${initialQuota.remainingUploads} remaining today)`);
  console.log(`=======================================================\n`);

  // 1. Pre-flight Circuit Breaker Check
  const preflight = quotaTracker.canUpload();
  if (!preflight.allowed) {
    const msg = `[CIRCUIT BREAKER PRE-FLIGHT] Batch halted before starting: ${preflight.reason}`;
    console.warn(`⚠️ ${msg}`);
    return {
      total: totalParts,
      uploadedCount: 0,
      halted: true,
      reason: msg,
      circuitBreakerOpen: true,
      uploadedClips: [],
      failedClips: []
    };
  }

  // 2. Strict for...of loop with await to guarantee sequential execution
  for (const clipItem of clipsArray) {
    // 1. Circuit Breaker Check before attempting current clip
    const quotaCheck = quotaTracker.canUpload();
    if (!quotaCheck.allowed) {
      haltedReason = `Safe daily limit cap reached (${quotaTracker.getQuotaStatus().uploadsToday}/${quotaTracker.getQuotaStatus().dailyLimit}). Halting remaining ${totalParts - partCount + 1} uploads to protect token quota pool.`;
      console.warn(`\n⚠️ [CIRCUIT BREAKER ENGAGED] ${haltedReason}`);
      if (typeof options.onQuotaWarning === 'function') {
        options.onQuotaWarning(haltedReason);
      }
      break;
    }

    const clipPath = typeof clipItem === 'string' ? clipItem : clipItem.path;
    const clipTitle = typeof clipItem === 'object' && clipItem.title 
      ? formatShortsTitle(clipItem.title) 
      : `Viral Highlight Clip - Part ${partCount}/${totalParts} #Shorts`;
    const clipDesc = typeof clipItem === 'object' && clipItem.description
      ? clipItem.description
      : `Part ${partCount} of ${totalParts} in the series.\n\n#Shorts #viral #trending\nAutomated with AutoClip AI.`;
    const privacyStatus = options.privacyStatus || 'public'; // 3. Setting video privacy status to public

    console.log(`-------------------------------------------------------`);
    console.log(`▶️ Uploading Part ${partCount} of ${totalParts}...`);
    console.log(`📁 File: ${clipPath}`);
    console.log(`🏷️ Title: "${clipTitle}"`);
    console.log(`🌐 Privacy: ${privacyStatus}`);

    // Ensure the file exists before attempting upload
    if (!clipPath || !fs.existsSync(clipPath)) {
      console.error(`❌ Error: Clip file not found at path: ${clipPath}. Skipping to next clip.`);
      failedResults.push({ part: partCount, clipPath, error: 'File not found on disk' });
      partCount++;
      continue;
    }

    let fileStream = null;

    try {
      fileStream = fs.createReadStream(clipPath);

      // Upload directly via YouTube Data API v3
      const uploadResponse = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: clipTitle,
            description: clipDesc,
            categoryId: '22', // 22 = People & Blogs
            tags: options.tags || ['Shorts', 'viral', 'series', 'clips', 'trending']
          },
          status: {
            // Setting each video's privacy status to public (or requested)
            privacyStatus: privacyStatus,
            selfDeclaredMadeForKids: false
          }
        },
        media: {
          body: fileStream
        }
      });

      const videoId = uploadResponse.data.id;
      const shortsUrl = `https://www.youtube.com/shorts/${videoId}`;

      // 5. Clear console logs showing progress and video link
      console.log(`✅ Upload successful for Part ${partCount}/${totalParts}!`);
      console.log(`🎬 YouTube Shorts URL: ${shortsUrl}`);
      console.log(`🆔 Video ID: ${videoId}`);

      // 1. Record operation in local quota tracker
      const updatedQuota = quotaTracker.recordUpload(videoId, { title: clipTitle, privacyStatus });

      uploadedResults.push({
        part: partCount,
        videoId: videoId,
        shortsUrl: shortsUrl,
        title: clipTitle,
        quotaRemaining: updatedQuota.remainingUploads
      });

      // Progress callback
      if (typeof options.onProgress === 'function') {
        options.onProgress({
          part: partCount,
          total: totalParts,
          videoId,
          shortsUrl,
          title: clipTitle,
          quotaRemaining: updatedQuota.remainingUploads
        });
      }

      // 3. Immediate local file cleanup (Fixing the Download/Duplicate Bug)
      // Crucial: Destroy the read stream first so Windows releases the file lock
      if (fileStream && !fileStream.destroyed) {
        fileStream.destroy();
      }

      const shouldDelete = options.deleteAfterUpload !== false;
      if (shouldDelete) {
        try {
          if (fs.existsSync(clipPath)) {
            fs.unlinkSync(clipPath);
            console.log(`🗑️ [CLEANUP] Successfully unlinked local clip file: ${clipPath}`);
          }
        } catch (unlinkErr) {
          console.warn(`⚠️ [CLEANUP WARNING] Could not unlink ${clipPath}: ${unlinkErr.message}`);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to upload Part ${partCount}/${totalParts}:`, error.message);

      // Clean up stream if failed
      if (fileStream && !fileStream.destroyed) {
        fileStream.destroy();
      }

      // 4. Error Handling & Specific Quota Catch (403 quotaExceeded)
      const isQuotaExceeded = error.code === 403 || 
        error.status === 403 || 
        (error.errors && error.errors.some(e => e.reason === 'quotaExceeded' || e.reason === 'dailyLimitExceeded')) ||
        (error.message && (error.message.includes('quotaExceeded') || error.message.includes('dailyLimitExceeded') || error.message.includes('quota')));

      if (isQuotaExceeded) {
        console.error(`\n🚫 [CRITICAL ERROR] YouTube API 403 quotaExceeded caught! Daily token pool exhausted.`);
        quotaTracker.tripCircuitBreaker('Google API 403 quotaExceeded: Daily token pool exhausted.');
        haltedReason = 'YouTube API daily quota exhausted (403 quotaExceeded). All remaining uploads in queue aborted.';
        
        failedResults.push({ part: partCount, clipPath, error: haltedReason });

        if (typeof options.onQuotaExceeded === 'function') {
          options.onQuotaExceeded(haltedReason);
        }
        break; // Instantly abort the entire batch queue
      }

      failedResults.push({ part: partCount, clipPath, error: error.message });
    }

    // 2. Small delay (10-to-15 seconds) between uploads to prevent rate-limiting & spam triggers
    if (partCount < totalParts && !haltedReason) {
      console.log(`⏳ Cooldown delay: Waiting ${delayMs / 1000} seconds before uploading Part ${partCount + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    partCount++;
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 Batch Summary: Successfully uploaded ${uploadedResults.length} of ${totalParts} clips.`);
  if (haltedReason) {
    console.log(`⚠️ Batch Halted Early: ${haltedReason}`);
  }
  const finalQuota = quotaTracker.getQuotaStatus();
  console.log(`📊 Quota Remaining Today: ${finalQuota.remainingUploads}/${finalQuota.dailyLimit}`);
  console.log(`=======================================================\n`);

  return {
    total: totalParts,
    uploadedCount: uploadedResults.length,
    halted: Boolean(haltedReason),
    reason: haltedReason,
    circuitBreakerOpen: quotaTracker.getQuotaStatus().isCircuitBreakerOpen,
    uploadedClips: uploadedResults,
    failedClips: failedResults
  };
}

module.exports = {
  getCredentials,
  saveCredentials,
  getOAuth2Client,
  getStoredTokens,
  saveTokens,
  getAuthUrl,
  handleAuthCallback,
  disconnectAccount,
  getStatus,
  uploadShort,
  formatShortsTitle,
  processAndUploadAllClips,
  quotaTracker
};


