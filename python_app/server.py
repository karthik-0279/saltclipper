"""
AutoClip AI - Full Production FastAPI Server (Python Edition)
Complete replacement and 1-to-1 conversion of server.js with FastAPI.
"""

import os
import sys
import json
import secrets
import asyncio
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import (
    FastAPI, 
    Request, 
    Response, 
    HTTPException, 
    BackgroundTasks, 
    Depends, 
    Cookie, 
    Header
)
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

from .services import quota_tracker
from .services import email_notifier
from .services import youtube_upload
from .services import video_engine
from .clip_manager import ClipManager
from .models import (
    Clip, 
    AspectRatio, 
    ProcessingMode, 
    User, 
    UserRole, 
    RenderJob, 
    BatchJob
)

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"
TEMP_DIR = BASE_DIR / "temp_clips"
TEMP_DIR.mkdir(exist_ok=True)

ADMIN_ID = (os.getenv("ADMIN_ID") or "admin@autoclip.ai").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD") or "admin123"

# In-memory session store & registered users
active_sessions: Dict[str, Dict[str, Any]] = {}
revoked_tokens = set()
registered_users: List[Dict[str, Any]] = [
    {
        "id": "usr_default_admin",
        "email": ADMIN_ID,
        "name": "Administrator",
        "password": ADMIN_PASSWORD,
        "role": "admin"
    }
]

# In-memory jobs and batch stores
jobs: Dict[str, Dict[str, Any]] = {}
batches: Dict[str, Dict[str, Any]] = {}

app = FastAPI(
    title="AutoClip AI Studio Server",
    description="Full Python FastAPI Backend with Video Slicing, YouTube Automation & Gemini AI",
    version="1.0.0"
)


# ==========================================
# Authentication Helpers
# ==========================================

def generate_session_token() -> str:
    return secrets.token_hex(32)


def get_current_session(
    request: Request,
    authorization: Optional[str] = Header(None),
    auth_token: Optional[str] = Cookie(None),
    session_id: Optional[str] = Cookie(None)
) -> Optional[Dict[str, Any]]:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    if not token:
        token = auth_token or session_id or request.cookies.get("connect.sid")

    if not token or token in revoked_tokens:
        return None

    session = active_sessions.get(token)
    if session and session["expiresAt"] < datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000:
        active_sessions.pop(token, None)
        return None

    return session


# ==========================================
# 1. Web Views & Login HTML Guard
# ==========================================

@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    login_html_path = BASE_DIR / "login.html"
    if login_html_path.exists():
        return login_html_path.read_text(encoding="utf-8")
    return "<h2>AutoClip AI Login Page</h2>"


@app.get("/")
def studio_index(request: Request):
    session = get_current_session(request)
    if not session:
        return RedirectResponse(url="/login")

    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)
    index_legacy = BASE_DIR / "index.html"
    if index_legacy.exists():
        return FileResponse(index_legacy)
    return RedirectResponse(url="/login")


# ==========================================
# 2. Authentication Endpoints
# ==========================================

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


@app.post("/api/login")
def api_login(payload: LoginRequest, request: Request, response: Response):
    email_norm = payload.email.strip().lower()
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    user_role = "user"
    user_name = email_norm.split("@")[0]
    user_id = ""

    if email_norm == ADMIN_ID:
        if payload.password != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Invalid login details. Please try again.")
        user_role = "admin"
        user_name = "Administrator"
        user_id = "usr_admin"
    else:
        user = next((u for u in registered_users if u["email"].lower() == email_norm), None)
        if not user or user["password"] != payload.password:
            raise HTTPException(status_code=401, detail="Invalid login details. Please try again.")
        user_role = user.get("role", "user")
        user_name = user.get("name", email_norm.split("@")[0])
        user_id = user["id"]

    token = generate_session_token()
    now_ms = datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000
    session_data = {
        "userId": user_id,
        "email": email_norm,
        "name": user_name,
        "role": user_role,
        "createdAt": now_ms,
        "expiresAt": now_ms + (24 * 3600 * 1000)
    }
    active_sessions[token] = session_data

    # Set cookies
    response.set_cookie(key="auth_token", value=token, max_age=86400, httponly=False)
    response.set_cookie(key="session_id", value=token, max_age=86400, httponly=True)

    # Dispatch security alert
    email_notifier.send_login_alert(
        user_email=email_norm,
        role=user_role,
        method="Admin Login" if user_role == "admin" else "Password Auth",
        ip_address=client_ip,
        user_agent=user_agent
    )

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "email": email_norm,
            "name": user_name,
            "role": user_role
        },
        "message": f"Signed in successfully as {user_role.title()}"
    }


@app.post("/api/register")
@app.post("/api/signup")
def api_register(payload: RegisterRequest, request: Request, response: Response):
    email_norm = payload.email.strip().lower()
    if email_norm == ADMIN_ID or any(u["email"].lower() == email_norm for u in registered_users):
        raise HTTPException(status_code=400, detail="An account with this email ID already exists.")

    new_user = {
        "id": f"usr_{int(datetime.datetime.now().timestamp())}_{secrets.token_hex(2)}",
        "name": payload.name.strip(),
        "email": email_norm,
        "password": payload.password,
        "role": "user"
    }
    registered_users.append(new_user)

    token = generate_session_token()
    now_ms = datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000
    active_sessions[token] = {
        "userId": new_user["id"],
        "email": email_norm,
        "name": new_user["name"],
        "role": "user",
        "createdAt": now_ms,
        "expiresAt": now_ms + (24 * 3600 * 1000)
    }

    response.set_cookie(key="auth_token", value=token, max_age=86400)
    return {
        "success": True,
        "token": token,
        "user": new_user,
        "message": "Account created successfully!"
    }


@app.post("/api/logout")
@app.get("/api/logout")
def api_logout(request: Request, response: Response):
    session = get_current_session(request)
    for k, v in list(active_sessions.items()):
        if session and v["userId"] == session["userId"]:
            revoked_tokens.add(k)
            active_sessions.pop(k, None)

    response.delete_cookie("auth_token")
    response.delete_cookie("session_id")
    response.delete_cookie("connect.sid")
    return {"success": True, "message": "Logged out successfully"}


@app.get("/api/auth/me")
def api_auth_me(request: Request):
    session = get_current_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {
        "authenticated": True,
        "user": {
            "id": session["userId"],
            "email": session["email"],
            "name": session["name"],
            "role": session["role"]
        }
    }


# ==========================================
# 3. YouTube OAuth & Quota
# ==========================================

@app.get("/api/auth/youtube")
@app.get("/api/auth/google")
def api_youtube_auth():
    try:
        url = youtube_upload.get_auth_url()
        return RedirectResponse(url=url)
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.get("/api/auth/youtube/callback")
@app.get("/api/auth/google/callback")
def api_youtube_callback(code: Optional[str] = None, error: Optional[str] = None):
    if error:
        return HTMLResponse(f"<h2 style='color:red;'>OAuth Error: {error}</h2>")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    try:
        tokens = youtube_upload.handle_auth_callback(code)
        return HTMLResponse("""
        <!DOCTYPE html>
        <html>
        <body style="background:#0b0f19;color:#34d399;font-family:sans-serif;text-align:center;padding:50px;">
          <h2>🎉 YouTube Channel Successfully Connected!</h2>
          <p style="color:#94a3b8;">Tokens have been stored safely. You can return to Studio.</p>
          <a href="/" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;">Return to Studio</a>
        </body>
        </html>
        """)
    except Exception as e:
        return HTMLResponse(f"<h2 style='color:red;'>Callback Failed: {e}</h2>")


@app.get("/api/auth/youtube/status")
def api_youtube_status():
    return youtube_upload.get_status()


@app.post("/api/auth/youtube/disconnect")
def api_youtube_disconnect(request: Request):
    session = get_current_session(request)
    if not session or session["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    youtube_upload.disconnect_account()
    return {"success": True, "message": "YouTube account disconnected"}


@app.get("/api/youtube/quota")
def api_youtube_quota():
    return {"success": True, **quota_tracker.get_quota_status()}


@app.post("/api/youtube/quota/reset")
def api_youtube_quota_reset(request: Request, payload: Dict[str, Any] = None):
    session = get_current_session(request)
    if not session or session["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    limit = payload.get("dailyLimit") if payload else None
    return {"success": True, "quota": quota_tracker.reset_quota(limit)}


# ==========================================
# 4. Video Slicing & Clip Rendering Endpoints
# ==========================================

class ExportClipRequest(BaseModel):
    sourceUrl: str
    startTime: int
    endTime: int
    aspect: str = "9:16"
    clipId: str = "1"
    autoUploadYouTube: bool = False
    privacyStatus: str = "public"
    title: str = "Viral Clip"


def run_clip_export_task(job_id: str, req: ExportClipRequest):
    job = jobs[job_id]

    def update_progress(pct: int, msg: str):
        job["progress"] = pct
        job["step"] = msg

    try:
        final_mp4 = video_engine.execute_trim_pipeline(
            job_id=job_id,
            video_url=req.sourceUrl,
            start_sec=req.startTime,
            end_sec=req.endTime,
            aspect=req.aspect,
            on_progress=update_progress
        )
        job["file"] = final_mp4
        job["filename"] = Path(final_mp4).name

        # If Auto-Upload to YouTube Shorts was requested
        if req.autoUploadYouTube:
            update_progress(90, "Auto-Uploading to YouTube Shorts...")
            upload_res = youtube_upload.upload_short(
                file_path=final_mp4,
                title=req.title,
                privacy_status=req.privacyStatus,
                delete_after_upload=False
            )
            job["uploadStatus"] = "UPLOADED"
            job["youtubeUrl"] = upload_res["shortsUrl"]
            job["youtubeVideoId"] = upload_res["videoId"]

        job["status"] = "COMPLETED"
        job["progress"] = 100
        job["step"] = "Completed successfully!"
    except Exception as err:
        job["status"] = "ERROR"
        job["error"] = str(err)
        job["step"] = f"Failed: {err}"


@app.post("/api/export-clip")
def api_export_clip(payload: ExportClipRequest, background_tasks: BackgroundTasks):
    job_id = f"job_{int(datetime.datetime.now().timestamp())}_{secrets.token_hex(3)}"
    jobs[job_id] = {
        "id": job_id,
        "status": "PROCESSING",
        "progress": 5,
        "step": "Initializing clip render...",
        "file": None,
        "filename": None,
        "uploadStatus": None,
        "youtubeUrl": None,
        "createdAt": datetime.datetime.now().timestamp() * 1000
    }
    background_tasks.add_task(run_clip_export_task, job_id, payload)
    return {"jobId": job_id, "status": "PROCESSING", "progress": 5}


@app.get("/api/clip-status")
def api_clip_status(jobId: str):
    job = jobs.get(jobId)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/download-artifact")
def api_download_artifact(jobId: str):
    job = jobs.get(jobId)
    if not job or not job.get("file") or not Path(job["file"]).exists():
        raise HTTPException(status_code=404, detail="Artifact file not found")
    return FileResponse(
        path=job["file"], 
        media_type="video/mp4", 
        filename=job.get("filename") or "clip.mp4"
    )


# ==========================================
# 5. Cloud AI & Gemini Integration
# ==========================================

@app.get("/api/cloud-ai/status")
def api_cloud_ai_status():
    return {
        "hasGeminiKey": bool(os.getenv("GEMINI_API_KEY")),
        "hasGoogleCredentials": bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")),
        "geminiModel": "gemini-2.5-flash"
    }


class CloudAiGenerateRequest(BaseModel):
    summary: Optional[str] = None
    topic: Optional[str] = None
    prompt: Optional[str] = None


@app.post("/api/cloud-ai/generate")
def api_cloud_ai_generate(payload: CloudAiGenerateRequest):
    from cloud_ai_pipeline import generate_script_with_gemini
    text = payload.summary or payload.topic
    if not text:
        raise HTTPException(status_code=400, detail="summary or topic is required")

    script = generate_script_with_gemini(text)
    return {"success": True, "script": script}


# Mount Static Files from Vite dist if built
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("python_app.server:app", host="0.0.0.0", port=port, reload=True)
