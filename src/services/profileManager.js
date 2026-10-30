/**
 * Google Cloud Console Projects & Multi-Account Rotation Controller
 * 
 * Production Architecture & YouTube Data API v3 Quota Engine:
 * - 5 Google Cloud Console Projects pre-configured in localStorage.
 * - YouTube Data API v3 Quota Rules:
 *   - 10,000 units daily limit per Google Cloud Project.
 *   - 1 video upload (videos.insert) = ~1,600 units.
 *   - Safe capacity = 6 uploads per project (6 * 1,600 = 9,600 units).
 *   - Total 5-project capacity = 50,000 units (~30 Shorts / day).
 * - Smart Quota Auto-Switching:
 *   - Pre-checks quota: rotates when quotaUnitsUsed + 1,600 > 10,000.
 *   - Catches 403 / 400 quota & upload limit errors ("exceeded the number of videos").
 *   - Seamless failover across 5 projects (1 -> 2 -> 3 -> 4 -> 5).
 * - Resilience & Retries:
 *   - Auto-retries transient network glitches and timeouts up to 3 times before rotating.
 *   - Proactive token validity check before queue execution.
 * - Minimalist Data Model:
 *   - Zero unnecessary clutter (keeps only OAuth Client ID, Client Secret, and Google Connect).
 */

export const PROFILES_STORAGE_KEY = 'autoclip_youtube_profiles';
export const GCP_PROJECTS_STORAGE_KEY = 'saltclipper_gcp_projects';
export const ROTATION_LOGS_STORAGE_KEY = 'autoclip_youtube_rotation_logs';

export const DAILY_QUOTA_LIMIT_UNITS = 10000;
export const UPLOAD_COST_UNITS = 1600;
export const MAX_SAFE_UPLOADS = Math.floor(DAILY_QUOTA_LIMIT_UNITS / UPLOAD_COST_UNITS); // 6

// 5 Dedicated Initial Google Cloud Console Projects (Minimalist: Client ID + Secret + Connect)
export const INITIAL_GCP_PROJECTS = [
  {
    id: 'gcp_proj_1',
    projectNumber: 1,
    projectName: 'Google Cloud Project 1',
    clientId: '7829104-saltclipper-proj1.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-sampleSecretProj1_Alpha',
    accessToken: '',
    tokenExpiresAt: 0,
    quotaUnitsUsed: 0,
    maxQuotaUnits: DAILY_QUOTA_LIMIT_UNITS,
    usedToday: 0,
    dailyLimit: MAX_SAFE_UPLOADS,
    status: 'ACTIVE', // ACTIVE | STANDBY | EXHAUSTED
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
  },
  {
    id: 'gcp_proj_2',
    projectNumber: 2,
    projectName: 'Google Cloud Project 2',
    clientId: '7829104-saltclipper-proj2.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-sampleSecretProj2_Beta',
    accessToken: '',
    tokenExpiresAt: 0,
    quotaUnitsUsed: 0,
    maxQuotaUnits: DAILY_QUOTA_LIMIT_UNITS,
    usedToday: 0,
    dailyLimit: MAX_SAFE_UPLOADS,
    status: 'STANDBY',
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString()
  },
  {
    id: 'gcp_proj_3',
    projectNumber: 3,
    projectName: 'Google Cloud Project 3',
    clientId: '7829104-saltclipper-proj3.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-sampleSecretProj3_Gamma',
    accessToken: '',
    tokenExpiresAt: 0,
    quotaUnitsUsed: 0,
    maxQuotaUnits: DAILY_QUOTA_LIMIT_UNITS,
    usedToday: 0,
    dailyLimit: MAX_SAFE_UPLOADS,
    status: 'STANDBY',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString()
  },
  {
    id: 'gcp_proj_4',
    projectNumber: 4,
    projectName: 'Google Cloud Project 4',
    clientId: '7829104-saltclipper-proj4.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-sampleSecretProj4_Delta',
    accessToken: '',
    tokenExpiresAt: 0,
    quotaUnitsUsed: 0,
    maxQuotaUnits: DAILY_QUOTA_LIMIT_UNITS,
    usedToday: 0,
    dailyLimit: MAX_SAFE_UPLOADS,
    status: 'STANDBY',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
  },
  {
    id: 'gcp_proj_5',
    projectNumber: 5,
    projectName: 'Google Cloud Project 5',
    clientId: '7829104-saltclipper-proj5.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-sampleSecretProj5_Epsilon',
    accessToken: '',
    tokenExpiresAt: 0,
    quotaUnitsUsed: 0,
    maxQuotaUnits: DAILY_QUOTA_LIMIT_UNITS,
    usedToday: 0,
    dailyLimit: MAX_SAFE_UPLOADS,
    status: 'STANDBY',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
  }
];

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Creates a valid minimal MP4 container blob for testing/multipart fallback
 */
export function createFallbackVideoBlob(title = 'Clip') {
  const ftyp = [
    0x00, 0x00, 0x00, 0x20,
    0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d,
    0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6f, 0x6d,
    0x69, 0x73, 0x6f, 0x32,
    0x61, 0x76, 0x63, 0x31,
    0x6d, 0x70, 0x34, 0x31
  ];
  const mdat = [
    0x00, 0x00, 0x00, 0x10,
    0x6d, 0x64, 0x61, 0x74,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
  ];
  return new Blob([new Uint8Array([...ftyp, ...mdat])], { type: 'video/mp4' });
}

/**
 * Retrieve the 5 Google Cloud Console projects from localStorage
 */
export function getYoutubeProfiles() {
  try {
    const raw = localStorage.getItem(GCP_PROJECTS_STORAGE_KEY) || localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p, idx) => ({
          ...p,
          id: p.id || `gcp_proj_${idx + 1}`,
          projectNumber: idx + 1,
          projectName: `Google Cloud Project ${idx + 1}`,
          clientId: p.clientId || '',
          clientSecret: p.clientSecret || '',
          maxQuotaUnits: DAILY_QUOTA_LIMIT_UNITS,
          dailyLimit: MAX_SAFE_UPLOADS,
          quotaUnitsUsed: Number(p.quotaUnitsUsed) || (Number(p.usedToday || 0) * UPLOAD_COST_UNITS) || 0,
          usedToday: Number(p.usedToday) || 0,
          status: p.status || (idx === 0 ? 'ACTIVE' : 'STANDBY')
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored Google Cloud projects, re-seeding:', e);
  }

  saveYoutubeProfiles(INITIAL_GCP_PROJECTS);
  return INITIAL_GCP_PROJECTS;
}

export const getGoogleProjects = getYoutubeProfiles;

/**
 * Persist projects to localStorage
 */
export function saveYoutubeProfiles(projects) {
  try {
    const serialized = JSON.stringify(projects);
    localStorage.setItem(GCP_PROJECTS_STORAGE_KEY, serialized);
    localStorage.setItem(PROFILES_STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Error saving Google Cloud projects:', e);
  }
}

export const saveGoogleProjects = saveYoutubeProfiles;

/**
 * Check token validity and expiration for a project or master token
 */
export function checkTokenValidity(project = null) {
  const target = project || getActiveProfile();
  let token = target?.accessToken;

  if (!token) {
    try {
      token = localStorage.getItem('youtube_access_token') ||
              localStorage.getItem('autoclip_youtube_oauth_token') ||
              localStorage.getItem('google_access_token');
    } catch (e) {}
  }

  if (!token || !token.trim()) {
    return {
      isValid: false,
      isExpired: false,
      token: null,
      message: 'No Google Account connected. Please click "Connect Google Account" to link your credentials.'
    };
  }

  // Check expiration if timestamp is set
  const expiresAt = target?.tokenExpiresAt || Number(localStorage.getItem('google_token_expires_at') || 0);
  if (expiresAt && Date.now() > expiresAt) {
    return {
      isValid: false,
      isExpired: true,
      token: token.trim(),
      message: 'Google OAuth token has expired. Please click "Connect Google Account" to refresh authorization.'
    };
  }

  return {
    isValid: true,
    isExpired: false,
    token: token.trim(),
    message: 'Token is active and authorized.'
  };
}

/**
 * Get currently ACTIVE Google Cloud Project
 */
export function getActiveProfile() {
  const projects = getYoutubeProfiles();
  let active = projects.find(p => p.status === 'ACTIVE');
  if (!active && projects.length > 0) {
    active = projects[0];
    active.status = 'ACTIVE';
    saveYoutubeProfiles(projects);
  }
  return active || null;
}

export const getActiveProject = getActiveProfile;

/**
 * Set a specific project as ACTIVE
 */
export function setActiveProfile(projectId) {
  const projects = getYoutubeProfiles();
  const updated = projects.map(p => {
    if (p.id === projectId || p.projectNumber === Number(projectId)) {
      return { ...p, status: 'ACTIVE' };
    }
    const isExhausted = (p.quotaUnitsUsed >= DAILY_QUOTA_LIMIT_UNITS) || (p.usedToday >= MAX_SAFE_UPLOADS);
    return { ...p, status: isExhausted ? 'EXHAUSTED' : 'STANDBY' };
  });
  saveYoutubeProfiles(updated);
  return updated;
}

export const setActiveProject = setActiveProfile;

/**
 * Update ONLY OAuth Client ID & Client Secret (Zero Clutter!)
 */
export function updateProjectCredentials(projectId, updates = {}) {
  const projects = getYoutubeProfiles();
  const updated = projects.map(p => {
    if (p.id === projectId || p.projectNumber === Number(projectId)) {
      return {
        ...p,
        clientId: updates.clientId !== undefined ? sanitize(updates.clientId.trim()) : p.clientId,
        clientSecret: updates.clientSecret !== undefined ? sanitize(updates.clientSecret.trim()) : p.clientSecret,
        accessToken: updates.accessToken !== undefined ? updates.accessToken.trim() : (p.accessToken || '')
      };
    }
    return p;
  });
  saveYoutubeProfiles(updated);
  return updated;
}

export const updateProfile = updateProjectCredentials;

/**
 * Add a new Google Cloud Project
 */
export function addNewProfile(data = {}) {
  const projects = getYoutubeProfiles();
  const nextNum = projects.length + 1;
  const newProject = {
    id: `gcp_proj_${Date.now()}`,
    projectNumber: nextNum,
    projectName: `Google Cloud Project ${nextNum}`,
    clientId: sanitize((data.clientId || '').trim()),
    clientSecret: sanitize((data.clientSecret || '').trim()),
    accessToken: data.accessToken ? data.accessToken.trim() : '',
    tokenExpiresAt: 0,
    quotaUnitsUsed: 0,
    maxQuotaUnits: DAILY_QUOTA_LIMIT_UNITS,
    usedToday: 0,
    dailyLimit: MAX_SAFE_UPLOADS,
    status: projects.length === 0 ? 'ACTIVE' : 'STANDBY',
    createdAt: new Date().toISOString()
  };
  const updated = [...projects, newProject];
  saveYoutubeProfiles(updated);
  return newProject;
}

/**
 * Delete a profile (maintains at least 1)
 */
export function deleteProfile(id) {
  const projects = getYoutubeProfiles();
  if (projects.length <= 1) return projects;
  const filtered = projects.filter(p => p.id !== id && p.projectNumber !== Number(id));
  if (!filtered.some(p => p.status === 'ACTIVE')) {
    filtered[0].status = 'ACTIVE';
  }
  saveYoutubeProfiles(filtered);
  return filtered;
}

/**
 * Master Authorization: Automatically links & authorizes all 5 Google Cloud Projects with OAuth credentials
 */
export function authorizeAllProjectsWithToken(token, channelInfo = {}) {
  if (!token || typeof token !== 'string') return;
  const cleanToken = token.trim();
  const expiresAt = Date.now() + 3600 * 1000;

  try {
    localStorage.setItem('youtube_access_token', cleanToken);
    localStorage.setItem('autoclip_youtube_oauth_token', cleanToken);
    localStorage.setItem('google_access_token', cleanToken);
    localStorage.setItem('google_token_expires_at', String(expiresAt));
    if (channelInfo.handle) localStorage.setItem('autoclip_channel_handle', channelInfo.handle);
    if (channelInfo.name) localStorage.setItem('autoclip_channel_name', channelInfo.name);
  } catch (e) {}

  const projects = getYoutubeProfiles();
  const updated = projects.map((p, idx) => ({
    ...p,
    accessToken: cleanToken,
    tokenExpiresAt: expiresAt,
    status: idx === 0 ? 'ACTIVE' : (p.status === 'EXHAUSTED' ? 'EXHAUSTED' : 'STANDBY')
  }));

  saveYoutubeProfiles(updated);
  return updated;
}

/**
 * Authorize an individual project with Google OAuth tokens
 */
export function authorizeSingleProject(projectId, token, channelInfo = {}) {
  if (!token || typeof token !== 'string') return;
  const cleanToken = token.trim();
  const expiresAt = Date.now() + 3600 * 1000;

  const projects = getYoutubeProfiles();
  const updated = projects.map(p => {
    if (p.id === projectId || p.projectNumber === Number(projectId)) {
      return {
        ...p,
        accessToken: cleanToken,
        tokenExpiresAt: expiresAt
      };
    }
    return p;
  });

  saveYoutubeProfiles(updated);
  return updated;
}

/**
 * Check if at least one project or master token is authorized
 */
export function isAnyProjectAuthorized() {
  try {
    const masterToken = 
      localStorage.getItem('youtube_access_token') ||
      localStorage.getItem('autoclip_youtube_oauth_token') ||
      localStorage.getItem('google_access_token');
    if (masterToken && masterToken.trim()) return true;
  } catch (e) {}

  const projects = getYoutubeProfiles();
  return projects.some(p => Boolean(p.accessToken && p.accessToken.trim()));
}

/**
 * Disconnect Google Account across all projects
 */
export function disconnectAllProjects() {
  try {
    localStorage.removeItem('youtube_access_token');
    localStorage.removeItem('autoclip_youtube_oauth_token');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('youtube_tokens');
    localStorage.removeItem('google_token_expires_at');
  } catch (e) {}

  const projects = getYoutubeProfiles();
  const updated = projects.map(p => ({
    ...p,
    accessToken: '',
    tokenExpiresAt: 0
  }));

  saveYoutubeProfiles(updated);
  return updated;
}

/**
 * Reset quota counter for a single project
 */
export function resetProfileQuota(id) {
  const projects = getYoutubeProfiles();
  const updated = projects.map(p => {
    if (p.id === id || p.projectNumber === Number(id)) {
      return {
        ...p,
        usedToday: 0,
        quotaUnitsUsed: 0,
        status: p.status === 'EXHAUSTED' ? 'STANDBY' : p.status
      };
    }
    return p;
  });
  saveYoutubeProfiles(updated);
  return updated;
}

export const resetProjectQuota = resetProfileQuota;

/**
 * Reset all 5 projects quota counters to 0 units
 */
export function resetAllProfilesQuota() {
  const projects = getYoutubeProfiles();
  let firstFound = false;
  const updated = projects.map(p => {
    const isFirstActive = !firstFound;
    if (isFirstActive) firstFound = true;
    return {
      ...p,
      usedToday: 0,
      quotaUnitsUsed: 0,
      status: isFirstActive ? 'ACTIVE' : 'STANDBY'
    };
  });
  saveYoutubeProfiles(updated);
  return updated;
}

export const resetAllProjectsQuota = resetAllProfilesQuota;

/**
 * Rotation Audit Logs
 */
export function getRotationLogs() {
  try {
    const raw = localStorage.getItem(ROTATION_LOGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return [];
  } catch (e) {
    return [];
  }
}

export function recordRotationLog({ fromProfile, toProfile, reason, clipTitle }) {
  try {
    const logs = getRotationLogs();
    const newEntry = {
      id: `rot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      readableTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      fromProfile: fromProfile || 'Project 1',
      toProfile: toProfile || 'Project 2',
      reason: reason || '10,000 Units Quota Limit — Intelligent Auto-Switch',
      clipTitle: clipTitle || 'YouTube Short'
    };
    const updated = [newEntry, ...logs].slice(0, 50);
    localStorage.setItem(ROTATION_LOGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Could not record rotation log:', e);
    return [];
  }
}

export function clearRotationLogs() {
  try {
    localStorage.removeItem(ROTATION_LOGS_STORAGE_KEY);
  } catch (e) {}
  return [];
}

/**
 * Smart Quota Auto-Switching Engine (10,000 Units Limit):
 * Seamlessly rotates from current project to the next in rotation
 * whenever the 10,000 quota units limit or a 403/400 upload limit is hit.
 */
export function rotateToNextProfile(reason = '10,000 Quota Units Limit Reached (~6 uploads) - Seamless Auto-Switch') {
  const projects = getYoutubeProfiles();
  const currentIndex = projects.findIndex(p => p.status === 'ACTIVE');
  const currentProject = currentIndex !== -1 ? projects[currentIndex] : projects[0];

  // Mark current as EXHAUSTED
  const updatedProjects = projects.map((p, idx) => {
    if (idx === currentIndex) {
      return { ...p, status: 'EXHAUSTED', quotaUnitsUsed: Math.max(p.quotaUnitsUsed, DAILY_QUOTA_LIMIT_UNITS) };
    }
    return p;
  });

  // Find next project in circular rotation (Project 1 -> 2 -> 3 -> 4 -> 5)
  let nextIndex = -1;
  const count = updatedProjects.length;
  for (let offset = 1; offset < count; offset++) {
    const candidateIdx = (currentIndex + offset) % count;
    const candidate = updatedProjects[candidateIdx];
    const canFitUpload = (candidate.quotaUnitsUsed + UPLOAD_COST_UNITS <= DAILY_QUOTA_LIMIT_UNITS) && candidate.status !== 'EXHAUSTED';
    if (canFitUpload) {
      nextIndex = candidateIdx;
      break;
    }
  }

  if (nextIndex === -1) {
    saveYoutubeProfiles(updatedProjects);
    return {
      rotated: false,
      allExhausted: true,
      currentProfile: currentProject,
      message: 'All 5 Google Cloud Projects have reached their 10,000 units quota limit. Reset quotas or add more accounts.'
    };
  }

  // Activate next project
  updatedProjects[nextIndex].status = 'ACTIVE';
  const newActiveProject = updatedProjects[nextIndex];
  saveYoutubeProfiles(updatedProjects);

  // Record rotation event in audit log
  recordRotationLog({
    fromProfile: currentProject.projectName,
    toProfile: newActiveProject.projectName,
    reason,
    clipTitle: 'Batch Auto-Switch Handshake'
  });

  return {
    rotated: true,
    allExhausted: false,
    previousProfile: currentProject,
    currentProfile: newActiveProject,
    message: `Intelligent Quota Auto-Switch: Switched from ${currentProject.projectName} ➔ ${newActiveProject.projectName} (10,000 units preserved).`
  };
}

export const rotateToNextProject = rotateToNextProfile;

/**
 * Aggregated Multi-Project Statistics (5 Projects - 10,000 Units Each)
 */
export function getMultiAccountStats() {
  const projects = getYoutubeProfiles();
  const totalProfiles = projects.length;
  const totalQuotaCapacityUnits = totalProfiles * DAILY_QUOTA_LIMIT_UNITS; // 50,000 units
  const totalQuotaUsedUnits = projects.reduce((sum, p) => sum + (p.quotaUnitsUsed || 0), 0);
  const totalQuotaRemainingUnits = Math.max(0, totalQuotaCapacityUnits - totalQuotaUsedUnits);

  const totalUploadsCapacity = totalProfiles * MAX_SAFE_UPLOADS; // 30 uploads
  const totalUsedToday = projects.reduce((sum, p) => sum + (p.usedToday || 0), 0);
  const totalRemaining = Math.max(0, totalUploadsCapacity - totalUsedToday);
  const activeProfile = getActiveProfile();
  const isAllExhausted = totalRemaining <= 0 || projects.every(p => p.status === 'EXHAUSTED');
  const percentUsed = totalQuotaCapacityUnits > 0 ? Math.min(100, Math.round((totalQuotaUsedUnits / totalQuotaCapacityUnits) * 100)) : 0;

  return {
    totalProfiles,
    totalQuotaCapacityUnits,
    totalQuotaUsedUnits,
    totalQuotaRemainingUnits,
    totalCapacity: totalUploadsCapacity,
    totalUsedToday,
    totalRemaining,
    percentUsed,
    isAllExhausted,
    activeProfile,
    profiles: projects
  };
}

export const getMultiProjectStats = getMultiAccountStats;

/**
 * Real YouTube Data API v3 Multipart Upload Request
 * 
 * Resilience & Retries:
 * - Validates token safety before executing.
 * - Auto-retries transient network glitches, timeouts, or 5xx server errors up to 3 times with backoff.
 * - Detects 403 / 400 quota & upload limit errors ("exceeded the number of videos", quotaExceeded).
 */
export async function uploadToYouTubeDataApiV3({
  clipTitle = 'Viral Clip',
  videoBlob = null,
  privacyStatus = 'public',
  project = null
}) {
  const activeProj = project || getActiveProfile();
  if (!activeProj) {
    throw new Error('No active Google Cloud project configured.');
  }

  // Check token validity & expiration
  const tokenCheck = checkTokenValidity(activeProj);
  if (!tokenCheck.isValid) {
    const err = new Error(tokenCheck.message);
    err.status = 401;
    err.isAuthMissing = true;
    err.isExpired = tokenCheck.isExpired;
    throw err;
  }

  const token = tokenCheck.token;
  const boundary = '===============SALTCLIPPER_BOUNDARY_' + Date.now() + '==';
  const cleanTitle = (clipTitle || 'Viral Video Clip').replace(/[^\w\s-]/g, '').trim().substring(0, 100);

  const metadata = {
    snippet: {
      title: `${cleanTitle} #Shorts`,
      description: `Auto-cut and uploaded via SALT CLIPPER.\n#Shorts #Viral`,
      tags: ['Shorts', 'Viral', 'Video', 'SALTCLIPPER'],
      categoryId: '22'
    },
    status: {
      privacyStatus: privacyStatus || 'public',
      selfDeclaredMadeForKids: false
    }
  };

  const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const videoHeaderPart = `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`;
  const footerPart = `\r\n--${boundary}--`;

  const blobPayload = videoBlob || createFallbackVideoBlob(cleanTitle);

  const multipartBlob = new Blob([metadataPart, videoHeaderPart, blobPayload, footerPart], {
    type: `multipart/related; boundary=${boundary}`
  });

  const uploadEndpoint = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';

  // Robust Network Glitch & Timeout Retry Loop (Up to 3 Attempts)
  let response = null;
  let networkAttempts = 0;
  const maxNetworkRetries = 3;

  while (networkAttempts < maxNetworkRetries) {
    networkAttempts++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      response = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBlob,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Retry on 5xx transient server glitches
      if (response.status >= 500 && networkAttempts < maxNetworkRetries) {
        console.warn(`[NETWORK GLITCH] YouTube API returned HTTP ${response.status}. Retrying (${networkAttempts}/${maxNetworkRetries})...`);
        await new Promise(r => setTimeout(r, networkAttempts * 1000));
        continue;
      }

      break; // Received HTTP response
    } catch (networkErr) {
      if (networkAttempts < maxNetworkRetries) {
        console.warn(`[NETWORK GLITCH] ${networkErr.message}. Retrying upload (${networkAttempts}/${maxNetworkRetries})...`);
        await new Promise(r => setTimeout(r, networkAttempts * 1000));
      } else {
        const err = new Error(`Network failure after ${maxNetworkRetries} retries: ${networkErr.message}`);
        err.isNetworkGlitch = true;
        throw err;
      }
    }
  }

  const responseJson = await response.json().catch(() => null);

  if (!response.ok) {
    const errorObj = responseJson?.error;
    const msg = errorObj?.message || `YouTube API returned HTTP ${response.status}`;
    const reason = errorObj?.errors?.[0]?.reason || '';

    const err = new Error(msg);
    err.status = response.status;
    err.reason = reason;
    err.responseBody = responseJson;

    // Detect 403 / 400 quota and upload limit errors
    const isQuotaOrLimit = 
      response.status === 403 || 
      response.status === 400 || 
      reason === 'quotaExceeded' || 
      reason === 'dailyLimitExceeded' ||
      reason === 'uploadLimitExceeded' ||
      reason === 'rateLimitExceeded' ||
      msg.toLowerCase().includes('exceeded the number of videos') ||
      msg.toLowerCase().includes('quota') ||
      msg.toLowerCase().includes('daily limit');

    if (isQuotaOrLimit) {
      err.isQuotaExceeded = true;
    }
    throw err;
  }

  const videoId = responseJson?.id;
  if (!videoId) {
    throw new Error('YouTube API upload succeeded but did not return a valid video ID.');
  }

  return {
    success: true,
    status: 'success',
    videoId,
    shortsUrl: `https://youtube.com/shorts/${videoId}`,
    title: cleanTitle,
    privacyStatus,
    accountUsed: {
      id: activeProj.id,
      projectNumber: activeProj.projectNumber,
      projectName: activeProj.projectName,
      usedToday: (activeProj.usedToday || 0) + 1,
      quotaUnitsUsed: (activeProj.quotaUnitsUsed || 0) + UPLOAD_COST_UNITS,
      dailyLimit: MAX_SAFE_UPLOADS
    },
    raw: responseJson,
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute YouTube upload with Intelligent Quota Rotation Controller:
 * Pre-checks 10,000 units limit. If hit or 403/400 returned, seamlessly
 * auto-rotates to Project 2 (up to Project 5) without interrupting the queue.
 */
export async function executeUploadWithRotation({
  clipTitle = 'Viral Clip',
  videoBlob = null,
  privacyStatus = 'public',
  scheduleTime = null,
  forceRotate = false
}) {
  let activeProject = getActiveProfile();
  let rotationNote = null;

  // Pre-check: If current project has reached 10,000 units or 6 uploads, auto-rotate proactively
  const isNearLimit = (activeProject?.quotaUnitsUsed + UPLOAD_COST_UNITS > DAILY_QUOTA_LIMIT_UNITS) || (activeProject?.usedToday >= MAX_SAFE_UPLOADS);
  if (forceRotate || isNearLimit) {
    const rotResult = rotateToNextProfile('10,000 Units Daily Limit Reached (~6 videos) - Proactive Auto-Switch');
    if (rotResult.rotated) {
      activeProject = rotResult.currentProfile;
      rotationNote = rotResult.message;
    } else if (rotResult.allExhausted) {
      throw new Error(rotResult.message);
    }
  }

  if (!activeProject) {
    const all = getYoutubeProfiles();
    activeProject = all[0];
  }

  // Attempt real upload with rotation failover loop across 5 projects
  let uploadResult = null;
  let attempts = 0;
  const maxProjectRotations = 5;

  while (attempts < maxProjectRotations) {
    attempts++;
    try {
      uploadResult = await uploadToYouTubeDataApiV3({
        clipTitle,
        videoBlob,
        privacyStatus: scheduleTime ? 'private' : privacyStatus,
        project: activeProject
      });
      break; // Successfully uploaded!
    } catch (uploadErr) {
      console.warn(`[YOUTUBE API ERROR] ${activeProject.projectName}:`, uploadErr.message);

      const isQuotaOrLimit =
        uploadErr.status === 403 ||
        uploadErr.status === 400 ||
        uploadErr.isQuotaExceeded ||
        uploadErr.message.toLowerCase().includes('exceeded the number of videos') ||
        uploadErr.message.toLowerCase().includes('quota') ||
        uploadErr.message.toLowerCase().includes('daily limit');

      const isAuthOrExpired =
        uploadErr.status === 401 ||
        uploadErr.isAuthMissing ||
        uploadErr.isExpired ||
        uploadErr.message.includes('token') ||
        uploadErr.message.includes('expired');

      if ((isQuotaOrLimit || isAuthOrExpired || uploadErr.isNetworkGlitch) && attempts < maxProjectRotations) {
        const reason = isQuotaOrLimit
          ? '10,000 Units Quota Limit Exceeded (400/403)'
          : (isAuthOrExpired ? 'OAuth Token Error' : 'Network Glitch Failover');

        const rot = rotateToNextProfile(`${reason} on ${activeProject.projectName} — Auto-switching to next project`);
        if (rot.rotated) {
          activeProject = rot.currentProfile;
          rotationNote = (rotationNote ? `${rotationNote} | ` : '') + rot.message;
          continue; // Retry with next Google Cloud project
        }
      }

      // If rotation cannot continue, re-throw
      throw uploadErr;
    }
  }

  if (!uploadResult) {
    throw new Error('Upload failed across all 5 available Google Cloud projects.');
  }

  // Increment usage on the project that successfully uploaded the clip
  const projects = getYoutubeProfiles();
  const updatedProjects = projects.map(p => {
    if (p.id === activeProject.id) {
      const newUsed = (p.usedToday || 0) + 1;
      const newQuotaUnits = (p.quotaUnitsUsed || 0) + UPLOAD_COST_UNITS;
      const isExhausted = newQuotaUnits + UPLOAD_COST_UNITS > DAILY_QUOTA_LIMIT_UNITS || newUsed >= MAX_SAFE_UPLOADS;
      return {
        ...p,
        usedToday: newUsed,
        quotaUnitsUsed: newQuotaUnits,
        status: isExhausted ? 'EXHAUSTED' : 'ACTIVE'
      };
    }
    return p;
  });
  saveYoutubeProfiles(updatedProjects);

  // If this project is now exhausted, pre-rotate to the next project
  if (activeProject.quotaUnitsUsed + UPLOAD_COST_UNITS + UPLOAD_COST_UNITS > DAILY_QUOTA_LIMIT_UNITS || (activeProject.usedToday + 1 >= MAX_SAFE_UPLOADS)) {
    const followUpRotation = rotateToNextProfile('Current project reached 10,000 units capacity; primed next Google Cloud project.');
    if (followUpRotation.rotated) {
      rotationNote = (rotationNote ? `${rotationNote} | ` : '') + followUpRotation.message;
    }
  }

  return {
    ...uploadResult,
    rotationNote
  };
}
