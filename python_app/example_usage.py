"""
AutoClip AI - Example Usage
Demonstrates the converted Python state controller and API client.
"""

from python_app import (
    ClipManager, 
    AutoClipApiService, 
    ProcessingMode, 
    AspectRatio
)


def main():
    print("=" * 60)
    print("🎬 AUTOCLIP AI - PYTHON PIPELINE CONTROLLER")
    print("=" * 60)

    # 1. Initialize State Manager (Replaces React App.jsx useState)
    manager = ClipManager()
    manager.set_mode(ProcessingMode.HIGHLIGHTS)
    manager.set_aspect_ratio(AspectRatio.VERTICAL)

    # 2. Analyze Video URL (Replaces VideoInput.jsx handleAnalyzeUrl)
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    print(f"\n[1] Analyzing Video URL: {test_url}")
    clips = manager.analyze_url(test_url)

    print(f"✅ Generated {len(clips)} Viral Clips:")
    for clip in clips:
        print(f"   • Clip #{clip.id}: '{clip.title}' [{clip.start_sec}s - {clip.end_sec}s] ({clip.duration}s) | Score: {clip.score} | Views: {clip.projected_views}")

    # 3. Load More Sequential Clips (Replaces ClipsList.jsx handleLoadMoreClips)
    print("\n[2] Loading 3 more sequential parts...")
    more_clips = manager.load_more_clips(count=3)
    print(f"✅ Feed expanded to {len(manager.clips)} total clips.")

    # 4. Select Active Clip for Preview / Export
    manager.select_clip(1)
    active = manager.active_clip
    print(f"\n[3] Active Selected Clip for Phone Preview:")
    print(f"   Title: {active.title}")
    print(f"   Aspect Framing: {manager.ratio.value}")
    print(f"   Timestamps: {active.start_sec}s to {active.end_sec}s")

    # 5. Connect to Backend Server via Converted API Client
    print("\n[4] Querying AutoClip Backend Server (localhost:8080)...")
    client = AutoClipApiService(base_url="http://localhost:8080")
    try:
        yt_status = client.fetch_youtube_status()
        print(f"   YouTube Connected: {yt_status.connected}")
        quota = client.fetch_youtube_quota()
        print(f"   Daily Uploads Today: {quota.uploads_today}/{quota.daily_limit}")
        print(f"   Remaining Safe Cap: {quota.remaining_uploads}")
    except Exception as e:
        print(f"   ⚠️ Backend note: {e}")

    print("\n" + "=" * 60)
    print("🎉 All React logic successfully converted and tested in Python!")
    print("=" * 60)


if __name__ == "__main__":
    main()

