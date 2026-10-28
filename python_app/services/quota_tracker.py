"""
AutoClip AI - YouTube Quota Tracker & Circuit Breaker (Python Edition)
Direct translation of services/quotaTracker.js
"""

import os
import json
import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TRACKER_FILE = BASE_DIR / "youtube_quota_tracker.json"
DEFAULT_DAILY_LIMIT = int(os.getenv("YOUTUBE_DAILY_UPLOAD_LIMIT", "85"))


def get_today_date_string() -> str:
    """Returns today's date in UTC: YYYY-MM-DD"""
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")


def load_quota_data() -> Dict[str, Any]:
    """
    Read persisted quota tracking data from disk.
    Automatically resets counter if the calendar date has rolled over.
    """
    today = get_today_date_string()
    default_data = {
        "date": today,
        "dailyLimit": DEFAULT_DAILY_LIMIT,
        "uploadsToday": 0,
        "circuitBreakerOpen": False,
        "circuitBreakerReason": None,
        "history": []
    }

    if not TRACKER_FILE.exists():
        save_quota_data(default_data)
        return default_data

    try:
        with open(TRACKER_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Date rollover check
        if data.get("date") != today:
            print(f"[QUOTA TRACKER] 🔄 New calendar day detected ({today} vs {data.get('date')}). Resetting daily upload count.")
            reset_data = {
                "date": today,
                "dailyLimit": data.get("dailyLimit", DEFAULT_DAILY_LIMIT),
                "uploadsToday": 0,
                "circuitBreakerOpen": False,
                "circuitBreakerReason": None,
                "history": []
            }
            save_quota_data(reset_data)
            return reset_data

        return {
            "date": data.get("date", today),
            "dailyLimit": data.get("dailyLimit", DEFAULT_DAILY_LIMIT),
            "uploadsToday": int(data.get("uploadsToday", 0)),
            "circuitBreakerOpen": bool(data.get("circuitBreakerOpen", False)),
            "circuitBreakerReason": data.get("circuitBreakerReason"),
            "history": data.get("history", []) if isinstance(data.get("history"), list) else []
        }
    except Exception as err:
        print(f"[QUOTA TRACKER] Error reading tracker file: {err}. Reinitializing.")
        save_quota_data(default_data)
        return default_data


def save_quota_data(data: Dict[str, Any]):
    """Persist quota tracking state to disk atomically."""
    try:
        with open(TRACKER_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as err:
        print(f"[QUOTA TRACKER] Failed to persist quota tracker file: {err}")


def get_next_reset_estimate() -> Dict[str, Any]:
    """Calculate time remaining until midnight UTC"""
    now = datetime.datetime.now(datetime.timezone.utc)
    tomorrow = now.date() + datetime.timedelta(days=1)
    next_reset = datetime.datetime(tomorrow.year, tomorrow.month, tomorrow.day, tzinfo=datetime.timezone.utc)
    diff = next_reset - now
    total_sec = int(diff.total_seconds())
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    return {
        "iso": next_reset.isoformat(),
        "hoursRemaining": hours,
        "minutesRemaining": minutes,
        "display": f"{hours}h {minutes}m"
    }


def get_quota_status() -> Dict[str, Any]:
    """Get comprehensive status of today's quota consumption"""
    data = load_quota_data()
    limit = data["dailyLimit"]
    uploads = data["uploadsToday"]
    remaining = max(0, limit - uploads)
    pct = round((uploads / limit) * 100) if limit > 0 else 100
    reset_info = get_next_reset_estimate()

    return {
        "date": data["date"],
        "dailyLimit": limit,
        "uploadsToday": uploads,
        "remainingUploads": remaining,
        "percentUsed": pct,
        "circuitBreakerOpen": data["circuitBreakerOpen"],
        "circuitBreakerReason": data["circuitBreakerReason"],
        "nextReset": reset_info,
        "canUpload": remaining > 0 and not data["circuitBreakerOpen"]
    }


def can_upload() -> Dict[str, Any]:
    """Pre-flight check before initiating YouTube upload"""
    status = get_quota_status()
    if status["circuitBreakerOpen"]:
        return {
            "allowed": False,
            "reason": f"Circuit breaker tripped: {status['circuitBreakerReason']}"
        }
    if status["remainingUploads"] <= 0:
        return {
            "allowed": False,
            "reason": f"Daily soft upload limit ({status['dailyLimit']}) reached. Resets in {status['nextReset']['display']}."
        }
    return {"allowed": True, "remaining": status["remainingUploads"]}


def record_upload(video_id: str, title: str, privacy: str = "public") -> Dict[str, Any]:
    """Increments today's upload count and appends audit record"""
    data = load_quota_data()
    data["uploadsToday"] += 1
    record = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "videoId": video_id,
        "title": title[:60],
        "privacy": privacy,
        "uploadNumber": data["uploadsToday"]
    }
    data["history"].append(record)
    if len(data["history"]) > 100:
        data["history"] = data["history"][-100:]

    if data["uploadsToday"] >= data["dailyLimit"]:
        data["circuitBreakerOpen"] = True
        data["circuitBreakerReason"] = f"Reached maximum configured daily limit of {data['dailyLimit']} uploads."
        print(f"[QUOTA TRACKER] ⚠️ Daily upload limit reached ({data['uploadsToday']}/{data['dailyLimit']}). Circuit breaker engaged.")

    save_quota_data(data)
    return get_quota_status()


def trip_circuit_breaker(reason: str):
    """Engage circuit breaker manually or upon 403 quotaExceeded from YouTube"""
    data = load_quota_data()
    data["circuitBreakerOpen"] = True
    data["circuitBreakerReason"] = reason
    save_quota_data(data)
    print(f"[QUOTA CIRCUIT BREAKER TRIPPED] {reason}")


def reset_quota(new_daily_limit: Optional[int] = None) -> Dict[str, Any]:
    """Reset quota tracking and circuit breaker state"""
    data = load_quota_data()
    if new_daily_limit is not None and new_daily_limit > 0:
        data["dailyLimit"] = new_daily_limit
    data["uploadsToday"] = 0
    data["circuitBreakerOpen"] = False
    data["circuitBreakerReason"] = None
    save_quota_data(data)
    print(f"[QUOTA TRACKER] Counter manually reset to 0 (Limit: {data['dailyLimit']}).")
    return get_quota_status()
