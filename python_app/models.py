"""
AutoClip AI - Data Models and Schema Definitions (PEP 8 Compliant)
Converted from React.js data structures, TypeScript types, and useState hooks.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl
import re


class ProcessingMode(str, Enum):
    """Corresponds to the 3 mode selector cards in VideoInput.jsx"""
    HIGHLIGHTS = "highlights"          # Mode 1: AI Viral Highlights
    WHOLE_VIDEO = "whole_video"        # Mode 2: Slices entire video sequentially
    DOWNLOAD_WHOLE = "download_whole"  # Mode 3: Direct HD MP4 download


class AspectRatio(str, Enum):
    """Aspect ratio framing"""
    VERTICAL = "9:16"
    HORIZONTAL = "16:9"


class VideoType(str, Enum):
    YOUTUBE = "youtube"
    LOCAL = "local"


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class PrivacyStatus(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    UNLISTED = "unlisted"


class User(BaseModel):
    """Corresponds to currentUser state in App.jsx and Auth headers"""
    id: str
    email: str
    name: str
    role: UserRole = UserRole.USER


class Clip(BaseModel):
    """
    Corresponds to clip item objects in clips state array (ClipsList.jsx & App.jsx).
    Supports camelCase serialization for React/JSON interoperability.
    """
    id: str
    start_sec: int = Field(..., alias="startSec", description="Clip start timestamp in seconds")
    end_sec: int = Field(..., alias="endSec", description="Clip end timestamp in seconds")
    score: int = Field(default=95, description="Virality score out of 100")
    projected_views: str = Field(default="1.2M", alias="projectedViews", description="Estimated viral reach")
    title: str = Field(..., description="High curiosity headline")

    @property
    def duration(self) -> int:
        return max(1, self.end_sec - self.start_sec)

    class Config:
        populate_by_name = True


class SingleClipUploadInfo(BaseModel):
    """Corresponds to clipUploads[clipId] state in App.jsx / ClipsList.jsx"""
    uploading: bool = False
    uploaded: bool = False
    shorts_url: Optional[str] = Field(None, alias="shortsUrl")
    video_id: Optional[str] = Field(None, alias="videoId")
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class RenderJob(BaseModel):
    """Corresponds to render progress and job state in ExportCenter.jsx"""
    job_id: str = Field(..., alias="jobId")
    status: str  # "PROCESSING" | "COMPLETED" | "ERROR"
    progress: int = 0
    step: str = ""
    filename: Optional[str] = None
    upload_status: Optional[str] = Field(None, alias="uploadStatus")
    youtube_url: Optional[str] = Field(None, alias="youtubeUrl")
    youtube_video_id: Optional[str] = Field(None, alias="youtubeVideoId")
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class BatchJob(BaseModel):
    """Corresponds to batchStatus state for Upload All Clips in App.jsx"""
    batch_id: str = Field(..., alias="batchId")
    status: str  # "PROCESSING" | "COMPLETED" | "HALTED" | "ERROR"
    current_part: int = Field(default=0, alias="currentPart")
    total_parts: int = Field(default=0, alias="totalParts")
    progress: int = 0
    step: str = ""
    uploaded_clips: List[Dict[str, Any]] = Field(default_factory=list, alias="uploadedClips")
    failed_clips: List[Dict[str, Any]] = Field(default_factory=list, alias="failedClips")
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class YouTubeStatus(BaseModel):
    """Corresponds to ytStatus state in YouTubeBar.jsx"""
    connected: bool = False
    channel_title: Optional[str] = Field(None, alias="channelTitle")
    channel_id: Optional[str] = Field(None, alias="channelId")
    custom_url: Optional[str] = Field(None, alias="customUrl")
    subscriber_count: Optional[str] = Field(None, alias="subscriberCount")

    class Config:
        populate_by_name = True


class YouTubeQuota(BaseModel):
    """Corresponds to ytQuota state in YouTubeBar.jsx"""
    uploads_today: int = Field(default=0, alias="uploadsToday")
    daily_limit: int = Field(default=85, alias="dailyLimit")
    remaining_uploads: int = Field(default=85, alias="remainingUploads")
    circuit_breaker_active: bool = Field(default=False, alias="circuitBreakerActive")

    class Config:
        populate_by_name = True

