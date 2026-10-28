"""
AutoClip AI - Email Security Notifier (Python Edition)
Direct translation of services/emailNotifier.js using smtplib & email.mime.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime
from typing import List, Dict, Any, Optional

recent_login_events: List[Dict[str, Any]] = []


def get_smtp_config():
    return {
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "secure": os.getenv("SMTP_SECURE", "false").lower() == "true",
        "user": os.getenv("SMTP_USER", "").strip(),
        "password": os.getenv("SMTP_PASS", "").strip()
    }


def send_login_alert(
    user_email: str,
    role: str = "user",
    method: str = "Password",
    ip_address: str = "127.0.0.1",
    user_agent: str = "Unknown"
) -> Dict[str, Any]:
    """
    Sends automated security email alert to administrator and logs login event.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    timestamp = now.isoformat()
    readable_time = now.strftime("%Y-%m-%d %H:%M:%S UTC")
    admin_alert_email = os.getenv("ADMIN_ALERT_EMAIL") or os.getenv("ADMIN_ID") or "admin@autoclip.ai"

    event_record = {
        "id": f"evt_{int(now.timestamp())}_{os.urandom(2).hex()}",
        "userEmail": user_email,
        "role": role,
        "method": method,
        "ipAddress": ip_address,
        "userAgent": user_agent,
        "timestamp": timestamp,
        "readableTime": readable_time
    }

    recent_login_events.insert(0, event_record)
    if len(recent_login_events) > 50:
        recent_login_events.pop()

    print("\n=======================================================")
    print("🚨 [SECURITY ALERT] New Login Detected!")
    print(f"👤 User:      {user_email} ({role.upper()})")
    print(f"🔑 Method:    {method}")
    print(f"🌐 IP:        {ip_address}")
    print(f"💻 Device:    {user_agent[:70]}")
    print(f"⏰ Time:      {readable_time}")
    print(f"📧 Recipient: {admin_alert_email}")
    print("=======================================================\n")

    cfg = get_smtp_config()
    if not cfg["user"] or not cfg["password"]:
        return {
            "sent": False,
            "method": "Console Audit Only",
            "reason": "SMTP_USER or SMTP_PASS not configured in .env."
        }

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🚨 [AutoClip AI Security] New {role.upper()} Login: {user_email}"
        msg["From"] = cfg["user"]
        msg["To"] = admin_alert_email

        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px;">
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 580px; margin: 0 auto;">
            <h2 style="color: #f8fafc; margin-top: 0;">🔔 Login Notification Alert</h2>
            <p>An authentication event has occurred on AutoClip AI Studio.</p>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #94a3b8;">User Email:</td><td style="font-weight: bold;">{user_email}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">Access Role:</td><td>{role.upper()}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">Login Method:</td><td>{method}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">IP Address:</td><td><code>{ip_address}</code></td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">Timestamp:</td><td>{readable_time}</td></tr>
            </table>
          </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html, "html"))

        if cfg["secure"] or cfg["port"] == 465:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=10)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=10)
            server.starttls()

        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["user"], [admin_alert_email], msg.as_string())
        server.quit()

        print(f"[EMAIL NOTIFIER] ✅ Alert email successfully dispatched to {admin_alert_email}")
        return {"sent": True, "method": "SMTP", "recipient": admin_alert_email}
    except Exception as err:
        print(f"[EMAIL NOTIFIER] ❌ Failed to dispatch SMTP email: {err}")
        return {"sent": False, "method": "SMTP", "error": str(err)}


def get_recent_login_events() -> List[Dict[str, Any]]:
    return list(recent_login_events)


def clear_recent_login_events():
    recent_login_events.clear()
