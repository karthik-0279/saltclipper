"""
AutoClip AI - Clip Manager and Application State Controller
Translates React useState hooks and event handlers from src/App.jsx & src/components/
into idiomatic Python state management.
"""

import re
from typing import List, Optional, Dict, Any
from .models import (
    Clip, 
    ProcessingMode, 
    AspectRatio, 
    VideoType, 
    SingleClipUploadInfo,
    User
)


class ClipManager:
    """
    State manager replacing the React useState hooks:
    - clips / activeClipIndex
    - mode
    - videoUrl / youtubeId / videoType
    - ratio
    - clipUploads
    """

    def __init__(self):
        self.current_user: Optional[User] = None
        self.token: Optional[str] = None
        self.mode: ProcessingMode = ProcessingMode.HIGHLIGHTS
        self.video_url: str = ""
        self.youtube_id: Optional[str] = None
        self.video_type: VideoType = VideoType.YOUTUBE
        self.local_file_path: Optional[str] = None
        self.is_analyzing: bool = False
        self.clips: List[Clip] = []
        self.active_clip_index: int = 0
        self.ratio: AspectRatio = AspectRatio.VERTICAL
        self.auto_upload_yt: bool = True
        self.clip_uploads: Dict[str, SingleClipUploadInfo] = {}

    def extract_youtube_id(self, url: str) -> Optional[str]:
        """Maps to handleAnalyzeUrl YouTube regex matcher in App.jsx"""
        pattern = r'(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})'
        match = re.search(pattern, url)
        return match.group(1) if match else None

    def analyze_url(self, url: str) -> List[Clip]:
        """
        Translates handleAnalyzeUrl in App.jsx:
        Validates URL, extracts YouTube ID, and sets up high-retention viral clips.
        """
        clean_url = url.strip()
        if not clean_url:
            raise ValueError("URL cannot be empty.")

        self.video_url = clean_url
        self.youtube_id = self.extract_youtube_id(clean_url)
        self.video_type = VideoType.YOUTUBE if self.youtube_id else VideoType.LOCAL

        # Generates viral segments mapped from App.jsx handleAnalyzeUrl
        self.clips = [
            Clip(
                id="1",
                start_sec=45,
                end_sec=110,
                score=99,
                projected_views="2.4M",
                title="Curiosity Loop & Shocking Twist"
            ),
            Clip(
                id="2",
                start_sec=180,
                end_sec=245,
                score=96,
                projected_views="1.8M",
                title="High Retention Breakdown"
            ),
            Clip(
                id="3",
                start_sec=320,
                end_sec=388,
                score=94,
                projected_views="1.2M",
                title="Unbelievable Viral Revelation"
            ),
            Clip(
                id="4",
                start_sec=460,
                end_sec=525,
                score=91,
                projected_views="850K",
                title="Intense Climax & Debate"
            )
        ]
        self.active_clip_index = 0
        return self.clips

    def load_more_clips(self, count: int = 5) -> List[Clip]:
        """
        Translates handleLoadMoreClips in App.jsx:
        Generates sequential continuous segments.
        """
        current_len = len(self.clips)
        new_clips = []
        for i in range(count):
            index = current_len + i
            start = index * 70
            end = start + 65
            score = max(85, 98 - index * 2)
            views = f"{max(400, 1500 - index * 80)}K"
            clip_id = str(index + 1)
            
            new_clip = Clip(
                id=clip_id,
                start_sec=start,
                end_sec=end,
                score=score,
                projected_views=views,
                title=f"Curiosity Spike Part #{clip_id}"
            )
            new_clips.append(new_clip)

        self.clips.extend(new_clips)
        return new_clips

    @property
    def active_clip(self) -> Optional[Clip]:
        """Gets currently selected active clip"""
        if 0 <= self.active_clip_index < len(self.clips):
            return self.clips[self.active_clip_index]
        return None

    def select_clip(self, index: int) -> Optional[Clip]:
        """Maps to onSelectClip in ClipsList.jsx"""
        if 0 <= index < len(self.clips):
            self.active_clip_index = index
            return self.clips[index]
        raise IndexError(f"Clip index {index} out of bounds.")

    def set_mode(self, mode: ProcessingMode):
        """Maps to onSelectMode in VideoInput.jsx"""
        self.mode = mode

    def set_aspect_ratio(self, ratio: AspectRatio):
        """Maps to ratio state toggle in ExportCenter.jsx"""
        self.ratio = ratio

    def mark_clip_uploading(self, clip_id: str):
        """Maps to onUploadSingleClip state setter"""
        self.clip_uploads[clip_id] = SingleClipUploadInfo(uploading=True)

    def mark_clip_uploaded(self, clip_id: str, shorts_url: str, video_id: str):
        """Marks clip as uploaded and saves shorts URL"""
        self.clip_uploads[clip_id] = SingleClipUploadInfo(
            uploading=False,
            uploaded=True,
            shorts_url=shorts_url,
            video_id=video_id
        )

    def mark_clip_failed(self, clip_id: str, error_message: str):
        """Records error on single clip upload"""
        self.clip_uploads[clip_id] = SingleClipUploadInfo(
            uploading=False,
            uploaded=False,
            error=error_message
        )

