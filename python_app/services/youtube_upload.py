"""
AutoClip AI - YouTube Upload & OAuth Integration (Python Edition)
Direct translation of services/youtubeUpload.js
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
import googleapiclient.discovery
import googleapiclient.errors
from googleapiclient.http import MediaFileUpload

from . import quota_tracker

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TOKENS_FILE = BASE_DIR / "youtube_tokens.json"
CONFIG_FILE = BASE_DIR / "oauth_config.json"

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly"
]


def get_credentials_config() -> Dict[str, str]:
    """Retrieve OAuth credentials from .env or oauth_config.json"""
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8080/api/auth/youtube/callback").strip()

    if (not client_id or not client_secret) and CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                client_id = client_id or saved.get("clientId", "")
                client_secret = client_secret or saved.get("clientSecret", "")
                redirect_uri = redirect_uri or saved.get("redirectUri", redirect_uri)
        except Exception as e:
            print(f"[YOUTUBE SERVICE] Error reading oauth_config.json: {e}")

    return {
        "clientId": client_id,
        "clientSecret": client_secret,
        "redirectUri": redirect_uri
    }


def save_credentials(client_id: str, client_secret: str, redirect_uri: Optional[str] = None) -> Dict[str, str]:
    """Save manual OAuth credentials to oauth_config.json"""
    cfg = {
        "clientId": client_id.strip(),
        "clientSecret": client_secret.strip(),
        "redirectUri": (redirect_uri or "http://localhost:8080/api/auth/youtube/callback").strip()
    }
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    return cfg


def get_auth_url() -> str:
    """Generate Google OAuth 2.0 authorization URL"""
    cfg = get_credentials_config()
    if not cfg["clientId"] or not cfg["clientSecret"]:
        raise ValueError("Google Client ID and Client Secret are not configured.")

    client_config = {
        "web": {
            "client_id": cfg["clientId"],
            "client_secret": cfg["clientSecret"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [cfg["redirectUri"]]
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=cfg["redirectUri"]
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )
    return auth_url


def handle_auth_callback(code: str) -> Dict[str, Any]:
    """Exchange OAuth authorization code for tokens and save to disk"""
    cfg = get_credentials_config()
    client_config = {
        "web": {
            "client_id": cfg["clientId"],
            "client_secret": cfg["clientSecret"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [cfg["redirectUri"]]
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=cfg["redirectUri"]
    )
    flow.fetch_token(code=code)
    creds = flow.credentials

    tokens = {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "scope": " ".join(creds.scopes or SCOPES),
        "token_type": "Bearer"
    }

    with open(TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(tokens, f, indent=2)

    return tokens


def get_stored_tokens() -> Optional[Dict[str, Any]]:
    if not TOKENS_FILE.exists():
        return None
    try:
        with open(TOKENS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def disconnect_account() -> bool:
    """Unlinks YouTube account by deleting token file"""
    if TOKENS_FILE.exists():
        try:
            TOKENS_FILE.unlink()
            return True
        except Exception:
            return False
    return True


def get_youtube_client():
    """Builds authorized YouTube v3 client with auto-refresh"""
    tokens = get_stored_tokens()
    if not tokens:
        raise ValueError("No authorized YouTube account found. Please connect your channel.")

    cfg = get_credentials_config()
    creds = Credentials(
        token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=cfg["clientId"],
        client_secret=cfg["clientSecret"],
        scopes=SCOPES
    )

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            tokens["access_token"] = creds.token
            with open(TOKENS_FILE, "w", encoding="utf-8") as f:
                json.dump(tokens, f, indent=2)
        except Exception as e:
            print(f"[YOUTUBE AUTH] Token refresh warning: {e}")

    return googleapiclient.discovery.build("youtube", "v3", credentials=creds)


def get_status() -> Dict[str, Any]:
    """Retrieve connected channel details and quota state"""
    quota_info = quota_tracker.get_quota_status()
    tokens = get_stored_tokens()
    cfg = get_credentials_config()

    if not tokens:
        return {
            "connected": False,
            "configured": bool(cfg["clientId"] and cfg["clientSecret"]),
            "quota": quota_info
        }

    try:
        youtube = get_youtube_client()
        res = youtube.channels().list(part="snippet,statistics", mine=True).execute()
        items = res.get("items", [])
        if not items:
            return {"connected": True, "channelTitle": "Authorized Channel", "quota": quota_info}

        channel = items[0]
        snippet = channel.get("snippet", {})
        stats = channel.get("statistics", {})

        return {
            "connected": True,
            "channelId": channel.get("id"),
            "channelTitle": snippet.get("title"),
            "customUrl": snippet.get("customUrl"),
            "thumbnailUrl": snippet.get("thumbnails", {}).get("default", {}).get("url"),
            "subscriberCount": stats.get("subscriberCount", "0"),
            "videoCount": stats.get("videoCount", "0"),
            "quota": quota_info
        }
    except Exception as err:
        return {
            "connected": False,
            "error": str(err),
            "quota": quota_info
        }


def upload_short(
    file_path: str,
    title: str,
    description: str = "",
    privacy_status: str = "public",
    delete_after_upload: bool = True
) -> Dict[str, Any]:
    """
    Uploads vertical video segment as a YouTube Short.
    Includes circuit-breaker check and daily upload accounting.
    """
    check = quota_tracker.can_upload()
    if not check["allowed"]:
        raise RuntimeError(f"Circuit Breaker active: {check.get('reason')}")

    target = Path(file_path)
    if not target.exists():
        raise FileNotFoundError(f"Video file not found: {file_path}")

    youtube = get_youtube_client()

    final_title = title if "#Shorts" in title else f"{title} #Shorts"
    final_desc = description if "#Shorts" in description else f"{description}\n\n#Shorts #Viral"

    body = {
        "snippet": {
            "title": final_title[:100],
            "description": final_desc,
            "tags": ["Shorts", "Viral", "AutoClip"],
            "categoryId": "22"
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(str(target), mimetype="video/mp4", resumable=True)

    try:
        request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
        response = None
        while response is None:
            status, response = request.next_chunk()

        video_id = response.get("id")
        shorts_url = f"https://youtube.com/shorts/{video_id}"

        # Record upload in daily quota tracker
        quota_state = quota_tracker.record_upload(video_id, title, privacy_status)

        # Cleanup video file if requested
        if delete_after_upload and target.exists():
            try:
                target.unlink()
            except Exception:
                pass

        return {
            "success": True,
            "videoId": video_id,
            "shortsUrl": shorts_url,
            "title": final_title,
            "privacyStatus": privacy_status,
            "quotaRemaining": quota_state["remainingUploads"]
        }
    except googleapiclient.errors.HttpError as http_err:
        err_str = str(http_err)
        if "quotaExceeded" in err_str or "dailyLimitExceeded" in err_str:
            quota_tracker.trip_circuit_breaker(f"YouTube 403 quotaExceeded: {err_str}")
        raise
