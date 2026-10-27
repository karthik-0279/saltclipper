import React, { useRef, useEffect } from 'react';

/**
 * PhonePlayer Component
 * Renders the video in a 9:16 mobile smartphone mockup frame (embedded YouTube or local video).
 */
export default function PhonePlayer({ 
  currentClip, 
  videoType, 
  youtubeId, 
  localFileUrl 
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoType === 'local' && videoRef.current && currentClip) {
      videoRef.current.currentTime = currentClip.startSec || 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentClip, videoType]);

  const ytEmbedUrl = youtubeId && currentClip
    ? `https://www.youtube.com/embed/${youtubeId}?start=${currentClip.startSec}&autoplay=1&controls=1`
    : null;

  return (
    <div className="phone-mockup">
      <div className="phone-notch" />
      <div className="video-viewport">
        {videoType === 'youtube' && ytEmbedUrl ? (
          <iframe 
            src={ytEmbedUrl} 
            title="9:16 Shorts Preview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : videoType === 'local' && localFileUrl ? (
          <video 
            ref={videoRef} 
            src={localFileUrl} 
            playsInline 
            controls 
          />
        ) : (
          <div className="player-empty-state">
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📱</div>
            <p style={{ fontWeight: 700, color: '#f1f5f9' }}>9:16 Mobile Viewport</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Paste a link above to preview viral clips</p>
          </div>
        )}
      </div>
    </div>
  );
}
