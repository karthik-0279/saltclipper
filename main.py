"""
AutoClip AI - Main Python Server Entrypoint
Run with: py main.py
"""

import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    print(f"🚀 Starting AutoClip AI Python FastAPI Server on http://localhost:{port}...")
    uvicorn.run("python_app.server:app", host="0.0.0.0", port=port, reload=True)
