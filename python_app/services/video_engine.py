"""
AutoClip AI - Video Processing Engine (Python Edition)
Direct translation of yt-dlp & FFmpeg slicing and framing logic from server.js
"""

import os
import sys
import subprocess
from pathlib import Path
from typing import Callable, Optional, Dict, Any

BASE_DIR = Path(__file__).resolve().parent.parent.parent
BIN_DIR = BASE_DIR / "bin"
TEMP_DIR = BASE_DIR / "temp_clips"
TEMP_DIR.mkdir(exist_ok=True)

# Locate yt-dlp and ffmpeg binaries
YTDLP_PATH = str(BIN_DIR / "yt-dlp.exe") if (BIN_DIR / "yt-dlp.exe").exists() else "yt-dlp"
FFMPEG_PATH = str(BIN_DIR / "ffmpeg.exe") if (BIN_DIR / "ffmpeg.exe").exists() else "ffmpeg"
NODE_PATH = os.getenv("NODE_PATH") or ("C:/Program Files/nodejs/node.exe" if Path("C:/Program Files/nodejs/node.exe").exists() else "node")


def execute_trim_pipeline(
    job_id: str,
    video_url: str,
    start_sec: int,
    end_sec: int,
    aspect: str = "9:16",
    on_progress: Optional[Callable[[int, str], None]] = None,
) -> str:
    """
    Downloads exact segment with yt-dlp and formats into 9:16 vertical or 16:9 with FFmpeg.
    Returns path to the completed MP4 video file.
    """
    raw_file = TEMP_DIR / f"{job_id}_raw.mp4"
    final_file = TEMP_DIR / f"{job_id}_final.mp4"
    duration = max(1, end_sec - start_sec)

    print(f"[PIPELINE {job_id}] Slicing: {video_url} [{start_sec}s - {end_sec}s] ({duration}s) -> {aspect}")
    if on_progress:
        on_progress(15, "Downloading video segment via yt-dlp...")

    # Step 1: yt-dlp download exact range
    time_range = f"*{start_sec}-{end_sec}"
    ytdl_args = [
        YTDLP_PATH,
        "--ffmpeg-location", FFMPEG_PATH,
        "--js-runtimes", f"node:{NODE_PATH}",
        "--download-sections", time_range,
        "-f", "best[ext=mp4]/best",
        "-o", str(raw_file),
        video_url
    ]

    proc = subprocess.run(ytdl_args, capture_output=True, text=True)
    if proc.returncode != 0 or not raw_file.exists():
        err_msg = f"yt-dlp extraction failed (code {proc.returncode}): {proc.stderr[-300:]}"
        print(f"[PIPELINE {job_id}] ❌ {err_msg}")
        raise RuntimeError(err_msg)

    print(f"[PIPELINE {job_id}] Segment downloaded ({raw_file.stat().st_size} bytes). Processing with FFmpeg...")
    if on_progress:
        on_progress(60, f"Reframing into {aspect} with FFmpeg...")

    # Step 2: FFmpeg framing
    if aspect == "9:16":
        filter_complex = (
            "[0:v]split=2[bg][fg];"
            "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=20[bgblur];"
            "[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fgscaled];"
            "[bgblur][fgscaled]overlay=(W-w)/2:(H-h)/2"
        )
        ffmpeg_args = [
            FFMPEG_PATH, "-y",
            "-i", str(raw_file),
            "-filter_complex", filter_complex,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            str(final_file)
        ]
    else:
        ffmpeg_args = [
            FFMPEG_PATH, "-y",
            "-i", str(raw_file),
            "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            str(final_file)
        ]

    f_proc = subprocess.run(ffmpeg_args, capture_output=True, text=True)

    # Clean raw segment
    if raw_file.exists():
        try:
            raw_file.unlink()
        except Exception:
            pass

    if f_proc.returncode != 0 or not final_file.exists():
        err_msg = f"FFmpeg reframing failed (code {f_proc.returncode}): {f_proc.stderr[-300:]}"
        print(f"[PIPELINE {job_id}] ❌ {err_msg}")
        raise RuntimeError(err_msg)

    print(f"[PIPELINE {job_id}] ✅ Trim SUCCESS! Final MP4: {final_file}")
    if on_progress:
        on_progress(100, "Rendering Complete! Playable MP4 Ready.")

    return str(final_file)


def download_full_video(
    job_id: str,
    video_url: str,
    output_filename: str,
    on_progress: Optional[Callable[[int, str], None]] = None
) -> str:
    """Downloads full original high quality video with yt-dlp"""
    final_file = TEMP_DIR / f"{job_id}.mp4"
    if on_progress:
        on_progress(20, "Downloading full HD video via yt-dlp...")

    ytdl_args = [
        YTDLP_PATH,
        "--ffmpeg-location", FFMPEG_PATH,
        "--js-runtimes", f"node:{NODE_PATH}",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "-o", str(final_file),
        video_url
    ]

    proc = subprocess.run(ytdl_args, capture_output=True, text=True)
    if proc.returncode != 0 or not final_file.exists():
        raise RuntimeError(f"Full video download failed: {proc.stderr[-300:]}")

    if on_progress:
        on_progress(100, "Download complete!")

    return str(final_file)
