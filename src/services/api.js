/**
 * Centralized API Client for AutoClip AI Backend
 * Proxied via Vite to http://localhost:8080 during development
 */

export async function fetchAuthUser(token) {
  const res = await fetch('/api/auth/me', {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Unauthenticated');
  return res.json();
}

export async function logoutUser(token) {
  const res = await fetch('/api/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    cache: 'no-store'
  });
  return res.json();
}

export async function fetchYouTubeStatus() {
  const res = await fetch('/api/auth/youtube/status');
  if (!res.ok) throw new Error('Failed to fetch YouTube status');
  return res.json();
}

export async function saveYouTubeConfig(clientId, clientSecret) {
  const res = await fetch('/api/auth/youtube/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret })
  });
  return res.json();
}

export async function disconnectYouTube() {
  const res = await fetch('/api/auth/youtube/disconnect', {
    method: 'POST'
  });
  return res.json();
}

export async function initiateClipRender(payload) {
  const res = await fetch('/api/export-clip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to initiate render');
  return data;
}

export async function pollJobStatus(jobId) {
  const res = await fetch(`/api/clip-status?jobId=${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error('Polling failed');
  return res.json();
}

export async function initiateFullVideoDownload(sourceUrl, title) {
  const res = await fetch('/api/download-full-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceUrl, title })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Full video download failed');
  return data;
}

export async function uploadAllClipsToYouTube(payload) {
  const res = await fetch('/api/upload-all-clips-to-youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Batch upload failed');
  return data;
}

export async function pollBatchStatus(batchId) {
  const res = await fetch(`/api/batch-status?batchId=${encodeURIComponent(batchId)}`);
  if (!res.ok) throw new Error('Batch status polling failed');
  return res.json();
}

export async function fetchAdminOverview() {
  const res = await fetch('/api/admin/overview', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch admin overview');
  return data;
}

export async function sendTestAdminAlert() {
  const res = await fetch('/api/admin/send-test-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to dispatch test notification');
  return data;
}

export async function fetchYouTubeQuota() {
  const res = await fetch('/api/youtube/quota', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch quota status');
  return data;
}

export async function resetYouTubeQuota(dailyLimit) {
  const res = await fetch('/api/youtube/quota/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dailyLimit })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reset quota tracker');
  return data;
}

// ==========================================
// Video Processing & Scheduled YouTube Uploads
// ==========================================

export async function processVideoPipeline(videoLink, scheduleTime = null, privacyStatus = 'public') {
  const res = await fetch('/api/export-clip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceUrl: videoLink,
      scheduleTime,
      privacyStatus
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Video pipeline failed');
  return data;
}

export async function uploadClipToYouTube({ filePath, title, privacyStatus = 'public', scheduleTime = null }) {
  const res = await fetch('/api/upload-to-youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath,
      title,
      privacyStatus,
      scheduleTime
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function generateGeminiScript(summary, prompt = null) {
  const res = await fetch('/api/cloud-ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary, prompt })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Script generation failed');
  return data;
}

export async function fetchCloudAiStatus() {
  const res = await fetch('/api/cloud-ai/status');
  if (!res.ok) throw new Error('Failed to fetch Cloud AI status');
  return res.json();
}




