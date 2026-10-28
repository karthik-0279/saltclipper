"""
AutoClip AI - Centralized Python API Service Client
Converted from src/services/api.js and backend communications.
"""

import time
import requests
from typing import Optional, Dict, Any, List
from .models import (
    User, 
    RenderJob, 
    BatchJob, 
    YouTubeStatus, 
    YouTubeQuota, 
    Clip
)


class AutoClipApiService:
    """
    Python client for interacting with the AutoClip AI Backend Server (default: http://localhost:8080).
    Directly translates all exported functions from src/services/api.js.
    """

    def __init__(self, base_url: str = "http://localhost:8080", token: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.session = requests.Session()

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    # 1. User & Auth
    def fetch_auth_user(self) -> Dict[str, Any]:
        """Maps to fetchAuthUser(token) in src/services/api.js"""
        url = f"{self.base_url}/api/auth/me"
        res = self.session.get(url, headers=self._headers(), timeout=10)
        res.raise_for_status()
        return res.json()

    def logout_user(self) -> Dict[str, Any]:
        """Maps to logoutUser(token) in src/services/api.js"""
        url = f"{self.base_url}/api/logout"
        res = self.session.post(url, headers=self._headers(), timeout=10)
        res.raise_for_status()
        self.token = None
        return res.json()

    # 2. YouTube OAuth & Config
    def fetch_youtube_status(self) -> YouTubeStatus:
        """Maps to fetchYouTubeStatus() in src/services/api.js"""
        url = f"{self.base_url}/api/auth/youtube/status"
        res = self.session.get(url, headers=self._headers(), timeout=10)
        res.raise_for_status()
        return YouTubeStatus(**res.json())

    def save_youtube_config(self, client_id: str, client_secret: str) -> Dict[str, Any]:
        """Maps to saveYouTubeConfig(clientId, clientSecret)"""
        url = f"{self.base_url}/api/auth/youtube/config"
        payload = {"clientId": client_id, "clientSecret": client_secret}
        res = self.session.post(url, json=payload, headers=self._headers(), timeout=10)
        res.raise_for_status()
        return res.json()

    def disconnect_youtube(self) -> Dict[str, Any]:
        """Maps to disconnectYouTube()"""
        url = f"{self.base_url}/api/auth/youtube/disconnect"
        res = self.session.post(url, headers=self._headers(), timeout=10)
        res.raise_for_status()
        return res.json()

    def fetch_youtube_quota(self) -> YouTubeQuota:
        """Maps to fetchYouTubeQuota()"""
        url = f"{self.base_url}/api/youtube/quota"
        res = self.session.get(url, headers=self._headers(), timeout=10)
        res.raise_for_status()
        return YouTubeQuota(**res.json())

    # 3. Clip Rendering Pipeline
    def initiate_clip_render(
        self,
        source_url: str,
        start_sec: int,
        end_sec: int,
        aspect: str = "9:16",
        clip_id: str = "1",
        auto_upload_youtube: bool = True,
        privacy_status: str = "public",
        title: str = "Viral Clip"
    ) -> Dict[str, Any]:
        """Maps to initiateClipRender(payload) in src/services/api.js"""
        url = f"{self.base_url}/api/export-clip"
        payload = {
            "sourceUrl": source_url,
            "startTime": start_sec,
            "endTime": end_sec,
            "aspect": aspect,
            "clipId": clip_id,
            "autoUploadYouTube": auto_upload_youtube,
            "privacyStatus": privacy_status,
            "title": title
        }
        res = self.session.post(url, json=payload, headers=self._headers(), timeout=15)
        res.raise_for_status()
        return res.json()

    def poll_job_status(self, job_id: str) -> RenderJob:
        """Maps to pollJobStatus(jobId)"""
        url = f"{self.base_url}/api/clip-status"
        res = self.session.get(url, params={"jobId": job_id}, headers=self._headers(), timeout=10)
        res.raise_for_status()
        return RenderJob(**res.json())

    def wait_for_job_completion(self, job_id: str, poll_interval_sec: float = 2.0, timeout_sec: int = 180) -> RenderJob:
        """
        Python automation helper: Synchronously polls until rendering and upload complete.
        """
        start_time = time.time()
        while time.time() - start_time < timeout_sec:
            job = self.poll_job_status(job_id)
            print(f"[{job.progress}%] {job.step}")
            if job.status == "COMPLETED":
                return job
            if job.status == "ERROR":
                raise RuntimeError(f"Rendering job failed: {job.error}")
            time.sleep(poll_interval_sec)
        raise TimeoutError(f"Job {job_id} timed out after {timeout_sec} seconds.")

    # 4. Batch Upload Pipeline
    def upload_all_clips_to_youtube(
        self,
        source_url: str,
        clips: List[Dict[str, Any]],
        aspect: str = "9:16",
        privacy_status: str = "public"
    ) -> Dict[str, Any]:
        """Maps to uploadAllClipsToYouTube(payload)"""
        url = f"{self.base_url}/api/upload-all-clips-to-youtube"
        payload = {
            "sourceUrl": source_url,
            "clips": clips,
            "aspect": aspect,
            "privacyStatus": privacy_status
        }
        res = self.session.post(url, json=payload, headers=self._headers(), timeout=15)
        res.raise_for_status()
        return res.json()

    def poll_batch_status(self, batch_id: str) -> BatchJob:
        """Maps to pollBatchStatus(batchId)"""
        url = f"{self.base_url}/api/batch-status"
        res = self.session.get(url, params={"batchId": batch_id}, headers=self._headers(), timeout=10)
        res.raise_for_status()
        return BatchJob(**res.json())

    # 5. Full Video Direct Download
    def initiate_full_video_download(self, source_url: str, title: str = "video") -> Dict[str, Any]:
        """Maps to initiateFullVideoDownload(sourceUrl, title)"""
        url = f"{self.base_url}/api/download-full-video"
        payload = {"sourceUrl": source_url, "title": title}
        res = self.session.post(url, json=payload, headers=self._headers(), timeout=15)
        res.raise_for_status()
        return res.json()

