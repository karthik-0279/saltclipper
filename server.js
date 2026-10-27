require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const youtubeUpload = require('./services/youtubeUpload');
const emailNotifier = require('./services/emailNotifier');

const DIR = __dirname;
const YTDLP_PATH = process.env.YTDLP_PATH || (process.platform === 'win32' 
  ? path.join(DIR, 'bin', 'yt-dlp.exe') 
  : (fs.existsSync(path.join(DIR, 'bin', 'yt-dlp')) ? path.join(DIR, 'bin', 'yt-dlp') : 'yt-dlp'));

const FFMPEG_PATH = process.env.FFMPEG_PATH || (process.platform === 'win32' 
  ? path.join(DIR, 'bin', 'ffmpeg.exe') 
  : (fs.existsSync(path.join(DIR, 'bin', 'ffmpeg')) ? path.join(DIR, 'bin', 'ffmpeg') : 'ffmpeg'));

const NODE_PATH = process.env.NODE_PATH || (process.platform === 'win32' && fs.existsSync('C:/Program Files/nodejs/node.exe') ? 'C:/Program Files/nodejs/node.exe' : 'node');
const TEMP_DIR = process.env.TEMP_DIR || path.join(DIR, 'temp_clips');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// In-memory Job Queue & Batch Store
const jobs = {};
const batches = {};

// Clean up artifacts older than 45 minutes
function cleanOldJobs() {
  const now = Date.now();
  for (const [id, job] of Object.entries(jobs)) {
    if (now - job.createdAt > 45 * 60 * 1000) {
      if (job.file && fs.existsSync(job.file)) {
        try { fs.unlinkSync(job.file); } catch (e) {}
      }
      delete jobs[id];
    }
  }
}
setInterval(cleanOldJobs, 5 * 60 * 1000);

// Helper: Extract clean clip ID (e.g. 2 from "2", 2, or "Clip #2")
function extractCleanClipId(clipId) {
  if (typeof clipId === 'number') return String(clipId);
  if (!clipId) return '1';
  const str = String(clipId).trim();
  const match = str.match(/\d+/);
  if (match) return match[0];
  return str.replace(/[^\w-]/g, '_') || '1';
}

// Helper: Parse "01:12" or "72" into integer seconds
function parseTimeToSeconds(val, defaultVal = 0) {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return defaultVal;
  const s = String(val).trim();
  if (s.includes(':')) {
    const parts = s.split(':').map(p => parseFloat(p) || 0);
    if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
    if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  const n = parseFloat(s);
  return isNaN(n) ? defaultVal : Math.round(n);
}

// Video Slicing Engine (yt-dlp + FFmpeg, Clean 9:16 / 16:9 Without Subtitles)
function executeTrimPipeline(jobId, videoUrl, startSec, endSec, aspect, onProgress, onDone, onError) {
  const rawFile = path.join(TEMP_DIR, `${jobId}_raw.mp4`);
  const finalFile = path.join(TEMP_DIR, `${jobId}_final.mp4`);
  const durationSec = Math.max(1, endSec - startSec);

  console.log(`[PIPELINE ${jobId}] Starting clip trim: ${videoUrl} [${startSec}s - ${endSec}s] (${durationSec}s) -> ${aspect}`);
  onProgress(15, 'Downloading video segment via yt-dlp...');

  // STEP 1: Download exact source video segment using yt-dlp
  const timeRange = `*${startSec}-${endSec}`;
  const ytdlArgs = [
    '--ffmpeg-location', FFMPEG_PATH,
    '--js-runtimes', `node:${NODE_PATH}`,
    '--download-sections', timeRange,
    '-f', 'best[ext=mp4]/best',
    '-o', rawFile,
    videoUrl
  ];

  const ytdlProc = spawn(YTDLP_PATH, ytdlArgs);
  let ytdlStderr = '';
  ytdlProc.stderr.on('data', d => { ytdlStderr += d.toString(); });

  ytdlProc.on('close', (code) => {
    if (code !== 0 || !fs.existsSync(rawFile)) {
      console.error(`[PIPELINE ${jobId}] yt-dlp failed (code ${code}):`, ytdlStderr.slice(-300));
      onError('Failed to extract video segment from URL: ' + (ytdlStderr.slice(-200) || `exit code ${code}`));
      return;
    }

    const rawSize = fs.statSync(rawFile).size;
    console.log(`[PIPELINE ${jobId}] Source segment downloaded (${rawSize} bytes). Slicing and reframing via FFmpeg...`);
    onProgress(60, `Reframing into ${aspect === '9:16' ? '9:16 Mobile Vertical' : '16:9'} via FFmpeg...`);

    // STEP 2: FFmpeg Slicing & Format Framing (Clean Video, No Subtitles)
    let ffmpegArgs = [];
    if (aspect === '9:16') {
      const filterComplex = '[0:v]split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=20[bgblur];[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fgscaled];[bgblur][fgscaled]overlay=(W-w)/2:(H-h)/2';
      ffmpegArgs = [
        '-y',
        '-i', rawFile,
        '-filter_complex', filterComplex,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        finalFile
      ];
    } else {
      ffmpegArgs = [
        '-y',
        '-i', rawFile,
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        finalFile
      ];
    }

    const ffmpegProc = spawn(FFMPEG_PATH, ffmpegArgs);
    let ffmpegStderr = '';
    ffmpegProc.stderr.on('data', d => { ffmpegStderr += d.toString(); });

    ffmpegProc.on('close', (fCode) => {
      // Remove temporary raw segment file
      try { if (fs.existsSync(rawFile)) fs.unlinkSync(rawFile); } catch (e) {}

      if (fCode !== 0 || !fs.existsSync(finalFile)) {
        console.error(`[PIPELINE ${jobId}] FFmpeg failed (code ${fCode}):`, ffmpegStderr.slice(-300));
        onError('Failed to reframe video with FFmpeg: ' + (ffmpegStderr.slice(-200) || `exit code ${fCode}`));
        return;
      }

      const outStat = fs.statSync(finalFile);
      console.log(`[PIPELINE ${jobId}] Trim SUCCESS! Playable MP4 generated (${outStat.size} bytes): ${finalFile}`);
      onProgress(100, 'Rendering Complete! Playable MP4 Ready.');
      onDone(finalFile, outStat.size);
    });
  });
}

// ==========================================
// AUTHENTICATION & SECURE SESSION STORE
// ==========================================
const activeSessions = new Map(); // token -> { userId, email, name, createdAt, expiresAt }
const revokedTokens = new Set();  // Blacklist of invalidated tokens to prevent token reuse

// Environment-backed Admin Authentication (Strictly loaded from .env)
const ADMIN_ID = (process.env.ADMIN_ID || '').trim().toLowerCase();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();

if (!ADMIN_ID || !ADMIN_PASSWORD) {
  console.warn('[SECURITY WARNING] ⚠️ ADMIN_ID and/or ADMIN_PASSWORD is not configured in .env. Admin login is disabled until configured.');
}

// Seeded Accounts (Strictly configured via environment variables)
const USERS = [
  ...(ADMIN_ID && ADMIN_PASSWORD ? [{ id: 'usr_admin', email: ADMIN_ID, password: ADMIN_PASSWORD, name: 'System Administrator', role: 'admin' }] : [])
];

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name) {
      list[name.trim()] = decodeURIComponent(rest.join('=').trim());
    }
  });
  return list;
}

function getSessionFromRequest(req) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    const cookies = parseCookies(req);
    token = cookies.auth_token || cookies.session_id;
  }
  if (!token) return null;

  // Revocation check: Token must not be blacklisted
  if (revokedTokens.has(token)) {
    return null;
  }

  const session = activeSessions.get(token);
  if (!session) return null;

  // Session expiry check (24 hours)
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    revokedTokens.add(token);
    return null;
  }

  return { token, ...session };
}

function setAuthCookies(res, token) {
  // Set secure HTTP-Only, SameSite=Strict cookies
  const authCookie = `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`;
  const sessionCookie = `session_id=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`;
  res.setHeader('Set-Cookie', [authCookie, sessionCookie]);
}

function clearAuthCookies(res) {
  // Clears and expires cookies immediately across client and intermediate proxies
  const expiredAuth = `auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`;
  const expiredSession = `session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`;
  const expiredConnect = `connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`;
  res.setHeader('Set-Cookie', [expiredAuth, expiredSession, expiredConnect]);
}

function setNoCacheHeaders(res) {
  // Strict anti-caching headers to guarantee Back button cannot access protected routes
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

const server = http.createServer(async (req, res) => {
  // Global CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:8080'}`);
  const pathname = parsedUrl.pathname;

  // ==========================================
  // CORE AUTHENTICATION ENDPOINTS
  // ==========================================

  // 1. Sign In: POST /api/login (Supports Admin & User Roles + Email Alert)
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email, password } = JSON.parse(body || '{}');
        if (!email || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Email and password are required.' }));
        }

        const normalizedEmail = email.trim().toLowerCase();
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const clientUa = req.headers['user-agent'] || 'Unknown Browser';

        let userRole = 'user';
        let userName = email.split('@')[0];
        let userId = '';

        // Check if Admin login credentials match
        if (normalizedEmail === ADMIN_ID) {
          if (password !== ADMIN_PASSWORD) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Invalid login details. Please try again.' }));
          }
          userRole = 'admin';
          userName = 'Administrator';
          userId = 'usr_admin';
        } else {
          // Regular user authentication
          let user = USERS.find(u => u.email.toLowerCase() === normalizedEmail);
          if (!user || user.password !== password) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Invalid login details. Please try again.' }));
          }
          userRole = user.role || 'user';
          userName = user.name || user.email.split('@')[0];
          userId = user.id;
        }

        const token = generateToken();
        const sessionData = {
          userId: userId,
          email: email.trim(),
          name: userName,
          role: userRole,
          createdAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        };

        activeSessions.set(token, sessionData);
        setNoCacheHeaders(res);
        setAuthCookies(res, token);

        console.log(`[AUTH] User signed in: ${email} [ROLE: ${userRole.toUpperCase()}] (Active sessions: ${activeSessions.size})`);

        // Trigger Automated Email Alert to Admin (asynchronous & non-blocking)
        emailNotifier.sendLoginAlert({
          userEmail: email.trim(),
          role: userRole,
          method: userRole === 'admin' ? 'Admin Direct Login' : 'Standard User Auth',
          ipAddress: clientIp,
          userAgent: clientUa
        }).catch(err => console.error('[EMAIL ALERT DISPATCH ERROR]', err.message));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          token: token,
          user: { 
            id: userId, 
            email: email.trim(), 
            name: userName, 
            role: userRole 
          },
          message: `Signed in successfully as ${userRole === 'admin' ? 'Administrator' : 'User'}`
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid payload: ' + err.message }));
      }
    });
    return;
  }

  // 1b. Create User Account: POST /api/register
  if ((pathname === '/api/register' || pathname === '/api/signup') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { name, email, password } = JSON.parse(body || '{}');
        if (!name || !email || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Full Name, Email ID, and Password are all required.' }));
        }

        const normalizedEmail = email.trim().toLowerCase();
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const clientUa = req.headers['user-agent'] || 'Unknown Browser';

        // Disallow registering with the Admin email address
        if (normalizedEmail === ADMIN_ID || USERS.some(u => u.email.toLowerCase() === normalizedEmail)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'An account with this email ID already exists. Please sign in.' }));
        }

        const newUser = {
          id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          email: normalizedEmail,
          password: password,
          role: 'user',
          createdAt: Date.now()
        };
        USERS.push(newUser);

        const token = generateToken();
        const sessionData = {
          userId: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: 'user',
          createdAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        };

        activeSessions.set(token, sessionData);
        setNoCacheHeaders(res);
        setAuthCookies(res, token);

        console.log(`[AUTH] New User Registered: ${newUser.name} (${newUser.email})`);

        // Trigger Automated Email Alert to Admin for new user creation
        emailNotifier.sendLoginAlert({
          userEmail: `${newUser.name} <${newUser.email}>`,
          role: 'user (New Registration)',
          method: 'New User Account Creation',
          ipAddress: clientIp,
          userAgent: clientUa
        }).catch(err => console.error('[EMAIL ALERT DISPATCH ERROR]', err.message));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          token: token,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: 'user'
          },
          message: 'Account created successfully! Welcome to AutoClip Studio.'
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid payload: ' + err.message }));
      }
    });
    return;
  }

  // 2. Log Out & Session Invalidation: POST /api/logout, /logout (and GET fallback)
  if (pathname === '/api/logout' || pathname === '/logout') {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    if (!token) {
      const cookies = parseCookies(req);
      token = cookies.auth_token || cookies.session_id || cookies['connect.sid'];
    }

    if (token) {
      // Invalidate active session and blacklist token
      activeSessions.delete(token);
      revokedTokens.add(token);
      console.log(`[AUTH] LOGOUT: Token invalidated and permanently blacklisted. Active sessions: ${activeSessions.size}`);
    }

    // Support req.session.destroy if session middleware is ever attached
    if (req.session && typeof req.session.destroy === 'function') {
      req.session.destroy(() => {});
    }

    // Expire HTTP-only auth cookies (including connect.sid, auth_token, session_id)
    clearAuthCookies(res);
    setNoCacheHeaders(res);

    if (req.method === 'GET') {
      res.writeHead(302, { 'Location': '/login?logout=1' });
      return res.end();
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }));
  }

  // 3. Current User Verification: GET /api/auth/me
  if (pathname === '/api/auth/me') {
    setNoCacheHeaders(res);
    const session = getSessionFromRequest(req);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ authenticated: false, error: 'Unauthorized or session revoked' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role || 'user'
      }
    }));
  }

  // 4. Login Page Route: GET /login and GET /login.html
  if (pathname === '/login' || pathname === '/login.html') {
    setNoCacheHeaders(res);
    const isReset = parsedUrl.searchParams.has('logout') || parsedUrl.searchParams.has('reset');
    if (isReset) {
      clearAuthCookies(res);
    } else {
      const session = getSessionFromRequest(req);
      if (session) {
        // If already authenticated, redirect to protected studio
        res.writeHead(302, { 'Location': '/' });
        return res.end();
      }
    }
    const loginFilePath = path.join(DIR, 'login.html');
    if (fs.existsSync(loginFilePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(loginFilePath).pipe(res);
      return;
    }
  }

  // 5. Protected Studio Route: GET / and GET /index.html
  if (pathname === '/' || pathname === '/index.html') {
    setNoCacheHeaders(res);
    const session = getSessionFromRequest(req);
    if (!session) {
      // Protected Route Guard: Redirect unauthenticated requests to /login
      console.log(`[AUTH GUARD] Protected route access denied for ${pathname}. Redirecting to /login.`);
      res.writeHead(302, { 'Location': '/login' });
      return res.end();
    }
    const distIndexPath = path.join(DIR, 'dist', 'index.html');
    const indexFilePath = fs.existsSync(distIndexPath) ? distIndexPath : path.join(DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(indexFilePath).pipe(res);
    return;
  }

  // ==========================================
  // YOUTUBE OAUTH 2.0 & UPLOAD ENDPOINTS
  // ==========================================

  // A. Initiate Google / YouTube OAuth Flow: GET /api/auth/google and GET /api/auth/youtube
  if (pathname === '/api/auth/google' || pathname === '/api/auth/youtube') {
    try {
      const authUrl = youtubeUpload.getAuthUrl();
      res.writeHead(302, { 'Location': authUrl });
      return res.end();
    } catch (err) {
      console.error('Error generating Google auth URL:', err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: err.message,
        setupRequired: true,
        instruction: 'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env or via /api/auth/youtube/config'
      }));
    }
  }

  // B. OAuth Callback: GET /api/auth/youtube/callback and GET /api/auth/google/callback
  if (pathname === '/api/auth/youtube/callback' || pathname === '/api/auth/google/callback') {
    const code = parsedUrl.searchParams.get('code');
    const oauthError = parsedUrl.searchParams.get('error');

    if (oauthError) {
      console.error('Error authenticating with Google:', oauthError);
      res.writeHead(400, { 'Content-Type': 'text/html' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Failed</title><style>body{background:#0b0f19;color:#fff;font-family:sans-serif;text-align:center;padding:50px;}</style></head>
        <body>
          <h2 style="color:#ef4444;">❌ Google / YouTube Authorization Error</h2>
          <p>${oauthError}</p>
          <a href="http://localhost:8080/" style="display:inline-block;margin-top:16px;background:#6366f1;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;">Return to Studio</a>
        </body>
        </html>
      `);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      return res.end('<p>Missing authorization code from Google.</p>');
    }

    try {
      const tokens = await youtubeUpload.handleAuthCallback(code);
      
      // Save tokens securely to active session
      const session = getSessionFromRequest(req);
      if (session) {
        session.tokens = tokens;
      }
      if (req.session) {
        req.session.tokens = tokens;
      }

      console.log('[AUTH] Successfully authenticated with Google/YouTube. Tokens stored securely.');

      // Dispatch login alert for Google OAuth integration
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const clientUa = req.headers['user-agent'] || 'Unknown Browser';
      emailNotifier.sendLoginAlert({
        userEmail: session?.email ? `${session.email} (Google Channel Connected)` : 'Google OAuth User',
        role: session?.role || 'user',
        method: 'Google OAuth 2.0 Auth',
        ipAddress: clientIp,
        userAgent: clientUa
      }).catch(err => console.error('[EMAIL NOTIFIER]', err.message));

      // Return user to studio dashboard (supports direct redirect and popup window auto-close)
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Connected to YouTube</title>
          <style>
            body { background: #0b0f19; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: #1e293b; border: 1.5px solid #10b981; border-radius: 16px; padding: 2.5rem; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { color: #34d399; margin: 0 0 1rem; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
            .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 12px; border-radius: 20px; font-weight: 700; margin-bottom: 1.5rem; }
            .btn { display: inline-block; background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; cursor: pointer; transition: 0.2s; }
            .btn:hover { background: #4f46e5; }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎉</div>
            <h2>YouTube Channel Connected!</h2>
            <div class="badge">Auto-Upload Ready</div>
            <p>Your YouTube channel has been authorized for automated YouTube Shorts uploads. Tokens saved securely to session.</p>
            <a href="http://localhost:8080/" class="btn" onclick="if(window.opener){try{window.opener.postMessage({type:'YOUTUBE_CONNECTED'},'*');}catch(e){} window.close(); return false;}">
              Return to AutoClip Studio
            </a>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'YOUTUBE_CONNECTED' }, '*');
                setTimeout(() => window.close(), 1500);
              } else {
                setTimeout(() => { window.location.href = 'http://localhost:8080/'; }, 1000);
              }
            } catch (e) {
              window.location.href = 'http://localhost:8080/';
            }
          </script>
        </body>
        </html>
      `);
    } catch (callbackErr) {
      console.error('Error authenticating with Google:', callbackErr);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Failed</title><style>body{background:#0b0f19;color:#fff;font-family:sans-serif;text-align:center;padding:50px;}</style></head>
        <body>
          <h2 style="color:#ef4444;">❌ Authentication Failed</h2>
          <p>${callbackErr.message || 'Error authenticating with Google'}</p>
          <a href="http://localhost:8080/" style="display:inline-block;margin-top:16px;background:#6366f1;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;">Return to Studio</a>
        </body>
        </html>
      `);
    }
  }

  // C. Connection Status: GET /api/auth/youtube/status
  if (pathname === '/api/auth/youtube/status') {
    try {
      const status = await youtubeUpload.getStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(status));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // D. Disconnect Account: POST /api/auth/youtube/disconnect (Admin Only)
  if (pathname === '/api/auth/youtube/disconnect' && req.method === 'POST') {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Admin permission required. You have view-only access.' }));
    }
    youtubeUpload.disconnectAccount();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'YouTube channel disconnected' }));
  }

  // E. Save Credentials Config: POST /api/auth/youtube/config (Admin Only)
  if (pathname === '/api/auth/youtube/config' && req.method === 'POST') {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Admin permission required. You have view-only access.' }));
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (!data.clientId || !data.clientSecret) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Client ID and Client Secret are required' }));
        }
        youtubeUpload.saveCredentials(data.clientId, data.clientSecret, data.redirectUri);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'OAuth credentials saved successfully' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // F. Quota & Circuit Breaker Status: GET /api/youtube/quota
  if (pathname === '/api/youtube/quota' && req.method === 'GET') {
    const quotaStatus = youtubeUpload.quotaTracker.getQuotaStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, ...quotaStatus }));
  }

  // G. Reset Quota & Circuit Breaker: POST /api/youtube/quota/reset (Admin Only)
  if (pathname === '/api/youtube/quota/reset' && req.method === 'POST') {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Admin permission required to reset quota tracking.' }));
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const resetStatus = youtubeUpload.quotaTracker.resetQuota(payload.dailyLimit);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: 'YouTube daily quota counter and circuit breaker successfully reset.',
          quota: resetStatus
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ==========================================
  // ADMIN DASHBOARD & NOTIFICATION API
  // ==========================================
  if (pathname === '/api/admin/overview' && req.method === 'GET') {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Admin privileges required' }));
    }

    const activeSessionsList = Array.from(activeSessions.values()).map(s => ({
      userId: s.userId,
      email: s.email,
      name: s.name,
      role: s.role || 'user',
      createdAt: s.createdAt,
      expiresAt: s.expiresAt
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      activeSessionsCount: activeSessions.size,
      sessions: activeSessionsList,
      users: USERS.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role || 'user' })),
      recentLogins: emailNotifier.getRecentEvents(),
      adminAlertEmail: process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_ID || 'admin@autoclip.ai',
      smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      serverUptimeSeconds: Math.round(process.uptime()),
      youtubeQuota: youtubeUpload.quotaTracker.getQuotaStatus()
    }));
  }

  if (pathname === '/api/admin/send-test-alert' && req.method === 'POST') {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Admin privileges required' }));
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const clientUa = req.headers['user-agent'] || 'Admin Console Trigger';

    const dispatchRes = await emailNotifier.sendLoginAlert({
      userEmail: session.email,
      role: 'admin',
      method: 'Admin Console Test Trigger',
      ipAddress: clientIp,
      userAgent: clientUa
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Test notification triggered!',
      details: dispatchRes
    }));
  }

  // F. Manual or On-Demand Upload: POST /api/upload-to-youtube
  if (pathname === '/api/upload-to-youtube' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');

        // Pre-flight Quota & Circuit Breaker Check
        const quotaCheck = youtubeUpload.quotaTracker.canUpload();
        if (!quotaCheck.allowed) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            error: `[CIRCUIT BREAKER] Safe daily upload limit cap reached. ${quotaCheck.reason || ''}`,
            quota: youtubeUpload.quotaTracker.getQuotaStatus()
          }));
        }

        let targetFile = data.filePath;
        if (!targetFile && data.jobId && jobs[data.jobId]) {
          targetFile = jobs[data.jobId].file;
        }

        if (!targetFile || !fs.existsSync(targetFile)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Target video file does not exist or has not been rendered yet.' }));
        }

        const result = await youtubeUpload.uploadShort(
          targetFile,
          data.title || 'High-Reach Viral Clip',
          data.description || '',
          { 
            privacyStatus: data.privacyStatus || 'public',
            deleteAfterUpload: data.deleteAfterUpload !== false // Immediately unlink to fix duplicate/download clutter
          }
        );

        if (data.jobId && jobs[data.jobId]) {
          jobs[data.jobId].youtubeVideoId = result.videoId;
          jobs[data.jobId].youtubeUrl = result.shortsUrl;
          jobs[data.jobId].uploadStatus = 'UPLOADED';
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        const status = err.message.includes('CIRCUIT BREAKER') || err.message.includes('quota') ? 429 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message, quota: youtubeUpload.quotaTracker.getQuotaStatus() }));
      }
    });
    return;
  }

  // G. Protected Batch Upload: POST /api/upload-all-clips-to-youtube (Sequential + Circuit Breaker)
  if (pathname === '/api/upload-all-clips-to-youtube' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const sourceUrl = data.sourceUrl || data.videoUrl;
        const clips = data.clips || [];
        const aspect = data.aspect || '9:16';
        const privacyStatus = data.privacyStatus || 'public'; // Set privacy status to public

        if (!sourceUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing sourceUrl parameter' }));
        }

        if (!Array.isArray(clips) || clips.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'No clips provided to upload' }));
        }

        const storedTokens = youtubeUpload.getStoredTokens();
        if (!storedTokens || (!storedTokens.refresh_token && !storedTokens.access_token)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Please connect your YouTube channel before uploading clips.' }));
        }

        // 1. Pre-flight Circuit Breaker & Quota Check
        const preflight = youtubeUpload.quotaTracker.canUpload();
        if (!preflight.allowed) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            error: `[CIRCUIT BREAKER] Safe daily upload limit cap reached. ${preflight.reason}`,
            circuitBreakerOpen: true,
            quota: youtubeUpload.quotaTracker.getQuotaStatus()
          }));
        }

        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        batches[batchId] = {
          id: batchId,
          status: 'PROCESSING',
          currentPart: 0,
          totalParts: clips.length,
          progress: 5,
          step: `Initializing sequential upload of ${clips.length} clips to YouTube Shorts...`,
          uploadedClips: [],
          failedClips: [],
          error: null,
          createdAt: Date.now()
        };

        // Respond immediately with batch ID so client can poll progress
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          batchId: batchId,
          totalParts: clips.length,
          message: `Batch upload started for ${clips.length} clips with Circuit Breaker active`
        }));

        // Execute batch pipeline sequentially in background
        (async () => {
          const batch = batches[batchId];

          // 2. Strict for...of loop with await to guarantee sequential execution
          for (let i = 0; i < clips.length; i++) {
            // 1. Quota & Circuit Breaker Check before each clip
            const quotaCheck = youtubeUpload.quotaTracker.canUpload();
            if (!quotaCheck.allowed) {
              const haltMsg = `[CIRCUIT BREAKER] Safe daily limit cap reached (${youtubeUpload.quotaTracker.getQuotaStatus().uploadsToday}/${youtubeUpload.quotaTracker.getQuotaStatus().dailyLimit}). Halting remaining ${batch.totalParts - i} uploads to protect API token pool.`;
              console.warn(`\n⚠️ ${haltMsg}`);
              batch.status = 'HALTED';
              batch.error = haltMsg;
              break;
            }

            const clip = clips[i];
            const partNum = i + 1;
            batch.currentPart = partNum;
            batch.step = `[Part ${partNum}/${batch.totalParts}] Trimming vertical video segment with FFmpeg (${aspect})...`;
            batch.progress = Math.round(((partNum - 1) / batch.totalParts) * 100 + 4);

            const startSec = parseTimeToSeconds(clip.startSec != null ? clip.startSec : clip.start, 0);
            const endSec = parseTimeToSeconds(clip.endSec != null ? clip.endSec : clip.end, startSec + 65);
            const cleanId = extractCleanClipId(clip.id || partNum);
            const clipJobId = `batch_${batchId}_part_${partNum}`;
            let finalFilePath = null;

            try {
              // A. Trim and reframe video segment
              finalFilePath = await new Promise((resolve, reject) => {
                executeTrimPipeline(
                  clipJobId,
                  sourceUrl,
                  startSec,
                  endSec,
                  aspect,
                  (pct, step) => {
                    batch.step = `[Part ${partNum}/${batch.totalParts}] ${step}`;
                  },
                  (filePath) => resolve(filePath),
                  (err) => reject(new Error(err))
                );
              });

              // B. Upload to YouTube Shorts
              batch.step = `[Part ${partNum}/${batch.totalParts}] Uploading to YouTube Shorts...`;
              batch.progress = Math.round(((partNum - 1) / batch.totalParts) * 100 + 15);

              const title = clip.title ? `${clip.title} #Shorts` : `Clip Part ${partNum}/${batch.totalParts} #Shorts`;
              const desc = clip.description || `Part ${partNum} of ${batch.totalParts} in series.\n\n#Shorts #viral #trending\nGenerated by AutoClip AI.`;

              // uploadShort automatically unlinks finalFilePath immediately upon success (Point 3)
              const uploadResult = await youtubeUpload.uploadShort(
                finalFilePath,
                title,
                desc,
                { 
                  privacyStatus,
                  deleteAfterUpload: true // 3. Immediate local file cleanup right after upload
                }
              );

              batch.uploadedClips.push({
                part: partNum,
                clipId: cleanId,
                title: uploadResult.title,
                videoId: uploadResult.videoId,
                shortsUrl: uploadResult.shortsUrl,
                quotaRemaining: uploadResult.quotaRemaining
              });

              batch.progress = Math.round((partNum / batch.totalParts) * 100);
              batch.step = `[Part ${partNum}/${batch.totalParts}] Successfully Uploaded! (${uploadResult.shortsUrl})`;

              // Safety check: ensure file is completely unlinked
              try { if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath); } catch (e) {}

              // 2. Cooldown delay between uploads (12 seconds) to avoid YouTube rate-limiting & spam triggers
              if (i < clips.length - 1 && batch.status === 'PROCESSING') {
                batch.step = `Cooldown: Waiting 12s before Part ${partNum + 1} to prevent rate-limiting...`;
                console.log(`[BATCH COOLDOWN] Waiting 12s delay before Part ${partNum + 1}...`);
                await new Promise(r => setTimeout(r, 12000));
              }

            } catch (clipErr) {
              console.error(`[BATCH ERROR Part ${partNum}]`, clipErr.message);
              batch.failedClips.push({ part: partNum, clipId: cleanId, error: clipErr.message });

              // Immediate cleanup on error so file doesn't linger
              try { if (finalFilePath && fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath); } catch (e) {}

              // 4. Specifically listen for 403 quotaExceeded
              const isQuotaError = clipErr.message.includes('quotaExceeded') || 
                clipErr.message.includes('dailyLimitExceeded') || 
                clipErr.message.includes('CIRCUIT BREAKER') || 
                clipErr.message.includes('quota');

              if (isQuotaError) {
                console.error(`🚫 [BATCH QUEUE ABORTED] 403 quotaExceeded caught! Daily token pool exhausted.`);
                batch.status = 'ERROR';
                batch.error = `YouTube API daily quota exhausted (403 quotaExceeded). All remaining ${batch.totalParts - partNum} uploads aborted.`;
                break; // Instantly abort the entire batch queue
              }
            }
          }

          if (batch.status === 'PROCESSING') {
            batch.status = batch.failedClips.length === batch.totalParts ? 'ERROR' : 'COMPLETED';
            batch.progress = 100;
            batch.step = `Upload Series Complete! Uploaded ${batch.uploadedClips.length}/${batch.totalParts} clips to YouTube Shorts.`;
          }
        })();

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // H. Batch Status Polling: GET /api/batch-status?batchId=...
  if (pathname === '/api/batch-status') {
    const batchId = parsedUrl.searchParams.get('batchId');
    const batch = batches[batchId];
    if (!batch) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Batch job not found' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(batch));
  }

  // 1. Download Whole Video: POST or GET /api/download-full-video
  if (pathname === '/api/download-full-video') {
    const handleFullDownload = (params) => {
      const videoUrl = params.sourceUrl || params.url;
      if (!videoUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing sourceUrl or url parameter' }));
      }

      const rawTitle = (params.title || 'video').trim();
      const cleanTitle = rawTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').substring(0, 45) || 'full_video';
      const downloadFilename = `${cleanTitle}_full.mp4`;
      const jobId = `full_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const fullFilePath = path.join(TEMP_DIR, `${jobId}.mp4`);
      const downloadUrl = `/api/download-artifact?jobId=${encodeURIComponent(jobId)}`;

      jobs[jobId] = {
        id: jobId,
        status: 'PROCESSING',
        progress: 15,
        step: 'Downloading complete original video in HD MP4 via yt-dlp...',
        file: null,
        filename: downloadFilename,
        cleanId: 'full',
        createdAt: Date.now(),
        error: null
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        jobId: jobId,
        status: 'PROCESSING',
        filename: downloadFilename,
        downloadUrl: downloadUrl,
        message: 'Full video download initiated via yt-dlp'
      }));

      console.log(`[FULL DOWNLOAD ${jobId}] Fetching whole video: ${videoUrl} -> ${downloadFilename}`);

      const ytdlArgs = [
        '--ffmpeg-location', FFMPEG_PATH,
        '--js-runtimes', `node:${NODE_PATH}`,
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', fullFilePath,
        videoUrl
      ];

      const proc = spawn(YTDLP_PATH, ytdlArgs);
      let ytdlStderr = '';
      proc.stderr.on('data', d => { ytdlStderr += d.toString(); });

      proc.on('close', (code) => {
        if (code !== 0 || !fs.existsSync(fullFilePath)) {
          console.error(`[FULL DOWNLOAD ${jobId}] yt-dlp failed (code ${code}):`, ytdlStderr.slice(-300));
          if (jobs[jobId]) {
            jobs[jobId].status = 'ERROR';
            jobs[jobId].error = 'Failed to download full video: ' + (ytdlStderr.slice(-200) || `exit code ${code}`);
          }
          return;
        }

        const stat = fs.statSync(fullFilePath);
        console.log(`[FULL DOWNLOAD ${jobId}] Complete! Full MP4 size: ${stat.size} bytes: ${fullFilePath}`);
        if (jobs[jobId]) {
          jobs[jobId].status = 'COMPLETED';
          jobs[jobId].progress = 100;
          jobs[jobId].step = 'Full video download complete!';
          jobs[jobId].file = fullFilePath;
        }
      });
    };

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let params = {};
        try { if (body) params = JSON.parse(body); } catch (e) {}
        params = Object.assign({}, Object.fromEntries(parsedUrl.searchParams.entries()), params);
        handleFullDownload(params);
      });
    } else {
      handleFullDownload(Object.fromEntries(parsedUrl.searchParams.entries()));
    }
    return;
  }

  // 2. Export / Render Clip Endpoint: POST /api/export-clip, /api/render-clip, /api/export, /api/create-clip
  if (req.method === 'POST' && (
    pathname === '/api/export-clip' ||
    pathname === '/api/render-clip' ||
    pathname === '/api/export' ||
    pathname === '/api/create-clip'
  )) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let params = {};
      try {
        if (body) params = JSON.parse(body);
      } catch (e) {
        params = Object.fromEntries(parsedUrl.searchParams.entries());
      }
      if (!params.sourceUrl && !params.url) {
        params = Object.assign({}, Object.fromEntries(parsedUrl.searchParams.entries()), params);
      }

      const videoUrl = params.sourceUrl || params.url;
      const startSec = parseTimeToSeconds(params.startTime != null ? params.startTime : params.start, 0);
      const endSec = parseTimeToSeconds(params.endTime != null ? params.endTime : params.end, startSec + 65);
      const rawClipId = params.clipId != null ? params.clipId : (params.id != null ? params.id : '2');
      const cleanId = extractCleanClipId(rawClipId);
      const aspect = params.aspect || '9:16';
      const filename = `clip_${cleanId}.mp4`;

      if (!videoUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing sourceUrl parameter' }));
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const downloadUrl = `/api/download-artifact?jobId=${encodeURIComponent(jobId)}`;

      jobs[jobId] = {
        id: jobId,
        status: 'PROCESSING',
        progress: 10,
        step: 'Initializing video trimming pipeline...',
        file: null,
        filename: filename,
        cleanId: cleanId,
        createdAt: Date.now(),
        error: null,
        autoUploadYouTube: Boolean(params.autoUploadYouTube),
        clipTitle: params.title || `Clip #${cleanId}`,
        clipDescription: params.description || '',
        privacyStatus: params.privacyStatus || 'public',
        uploadStatus: 'IDLE',
        uploadError: null,
        youtubeVideoId: null,
        youtubeUrl: null,
        watchUrl: null
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        jobId: jobId,
        status: 'PROCESSING',
        clipId: cleanId,
        filename: filename,
        downloadUrl: downloadUrl,
        message: 'Video trimming pipeline initiated with FFmpeg & yt-dlp'
      }));

      executeTrimPipeline(
        jobId,
        videoUrl,
        startSec,
        endSec,
        aspect,
        (progress, step) => {
          if (jobs[jobId]) {
            jobs[jobId].progress = progress;
            jobs[jobId].step = step;
          }
        },
        (finalFilePath, fileSize) => {
          if (jobs[jobId]) {
            jobs[jobId].file = finalFilePath;

            // Check if Auto-Upload to YouTube Shorts is requested and account is connected
            const shouldAutoUpload = jobs[jobId].autoUploadYouTube;
            const storedTokens = youtubeUpload.getStoredTokens();
            const isAuthorized = !!(storedTokens && (storedTokens.refresh_token || storedTokens.access_token));

            if (shouldAutoUpload && isAuthorized) {
              jobs[jobId].uploadStatus = 'UPLOADING';
              jobs[jobId].progress = 92;
              jobs[jobId].step = 'Rendering done! 🚀 Auto-uploading directly to YouTube Shorts...';
              console.log(`[PIPELINE ${jobId}] Triggering automatic YouTube Shorts upload...`);

              youtubeUpload.uploadShort(
                finalFilePath,
                jobs[jobId].clipTitle || jobs[jobId].filename,
                jobs[jobId].clipDescription || '',
                { privacyStatus: jobs[jobId].privacyStatus || 'private' }
              ).then(uploadRes => {
                if (jobs[jobId]) {
                  jobs[jobId].uploadStatus = 'UPLOADED';
                  jobs[jobId].youtubeVideoId = uploadRes.videoId;
                  jobs[jobId].youtubeUrl = uploadRes.shortsUrl;
                  jobs[jobId].watchUrl = uploadRes.watchUrl;
                  jobs[jobId].status = 'COMPLETED';
                  jobs[jobId].progress = 100;
                  jobs[jobId].step = `Successfully Uploaded to YouTube Shorts! 🎉 (${uploadRes.shortsUrl})`;
                  console.log(`[PIPELINE ${jobId}] YouTube Shorts auto-upload COMPLETE: ${uploadRes.shortsUrl}`);
                }
              }).catch(uploadErr => {
                console.error(`[PIPELINE ${jobId}] YouTube Shorts auto-upload FAILED:`, uploadErr.message);
                if (jobs[jobId]) {
                  jobs[jobId].uploadStatus = 'FAILED';
                  jobs[jobId].uploadError = uploadErr.message;
                  jobs[jobId].status = 'COMPLETED'; // MP4 is still ready for local download
                  jobs[jobId].progress = 100;
                  jobs[jobId].step = `MP4 Ready (YouTube Upload note: ${uploadErr.message})`;
                }
              });

            } else {
              jobs[jobId].status = 'COMPLETED';
              jobs[jobId].progress = 100;
              jobs[jobId].step = 'Rendering Complete! Playable MP4 Ready.';
            }
          }
        },
        (errorMsg) => {
          if (jobs[jobId]) {
            jobs[jobId].status = 'ERROR';
            jobs[jobId].error = errorMsg;
          }
        }
      );
    });
    return;
  }

  // 3. Poll Status Endpoint: GET /api/clip-status?jobId=...
  if (pathname === '/api/clip-status') {
    const jobId = parsedUrl.searchParams.get('jobId');
    const job = jobs[jobId];

    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Job not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      id: job.id,
      status: job.status,
      progress: job.progress,
      step: job.step,
      clipId: job.cleanId,
      filename: job.filename,
      downloadUrl: `/api/download-artifact?jobId=${encodeURIComponent(job.id)}`,
      youtubeVideoId: job.youtubeVideoId || null,
      youtubeUrl: job.youtubeUrl || null,
      watchUrl: job.watchUrl || null,
      uploadStatus: job.uploadStatus || 'IDLE',
      uploadError: job.uploadError || null,
      error: job.error
    }));
  }

  // 4. Finalized Asset Download: GET /api/download-artifact?jobId=...
  if (pathname === '/api/download-artifact') {
    const jobId = parsedUrl.searchParams.get('jobId');
    const job = jobs[jobId];

    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Job not found' }));
    }

    if (job.status !== 'COMPLETED' || !job.file || !fs.existsSync(job.file)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Rendering not finished or file missing', status: job.status }));
    }

    const stat = fs.statSync(job.file);
    const downloadFilename = job.filename || `clip_${job.cleanId || '2'}.mp4`;
    console.log(`[DOWNLOAD] Serving finalized real MP4 video (${stat.size} bytes): ${downloadFilename}`);

    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${downloadFilename}"`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(job.file);
    stream.pipe(res);
    return;
  }

  // 5. Direct Synchronous Stream / Download: GET /api/download-clip or GET /api/export-clip
  if (pathname === '/api/download-clip' || (req.method === 'GET' && pathname === '/api/export-clip')) {
    const videoUrl = parsedUrl.searchParams.get('sourceUrl') || parsedUrl.searchParams.get('url');
    const startSec = parseTimeToSeconds(parsedUrl.searchParams.get('startTime') || parsedUrl.searchParams.get('start'), 0);
    const endSec = parseTimeToSeconds(parsedUrl.searchParams.get('endTime') || parsedUrl.searchParams.get('end'), startSec + 65);
    const rawClipId = parsedUrl.searchParams.get('clipId') || parsedUrl.searchParams.get('id') || '2';
    const cleanId = extractCleanClipId(rawClipId);
    const aspect = parsedUrl.searchParams.get('aspect') || '9:16';
    const downloadFilename = `clip_${cleanId}.mp4`;

    if (!videoUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing sourceUrl parameter' }));
    }

    const directJobId = `direct_${Date.now()}_${cleanId}`;
    executeTrimPipeline(
      directJobId,
      videoUrl,
      startSec,
      endSec,
      aspect,
      (progress, step) => { console.log(`[DIRECT ${directJobId}] ${progress}% - ${step}`); },
      (finalFilePath, fileSize) => {
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Length': fileSize,
          'Content-Disposition': `attachment; filename="${downloadFilename}"`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        });
        const stream = fs.createReadStream(finalFilePath);
        stream.pipe(res);
        stream.on('finish', () => {
          try { fs.unlinkSync(finalFilePath); } catch (e) {}
        });
      },
      (errorMsg) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorMsg }));
      }
    );
    return;
  }

  // 6. Serve Static Files (with dist/ support for Vite React assets)
  let reqPath = parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname.replace(/^\//, '');
  let filePath = path.join(DIR, reqPath);

  if (!fs.existsSync(filePath)) {
    const distPath = path.join(DIR, 'dist', reqPath);
    if (fs.existsSync(distPath)) {
      filePath = distPath;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'text/html';
  if (ext === '.css') contentType = 'text/css';
  else if (ext === '.js') contentType = 'text/javascript';
  else if (ext === '.json') contentType = 'application/json';
  else if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg') contentType = 'image/jpeg';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = parseInt(process.env.PORT || '8080', 10);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AutoClip AI Server running on port ${PORT}`);
});
