import React, { useRef, useEffect } from 'react';

/**
 * PhonePlayer Component
 * Renders the video in a 9:16 mobile smartphone mockup frame (embedded YouTube or local video).
 * Styled with sleek Minimalist Black & White theme.
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
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', color: '#FFFFFF' }}>📱</div>
            <p style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '1.05rem' }}>9:16 Mobile Viewport</p>
            <p style={{ fontSize: '0.82rem', marginTop: '6px', color: 'var(--text-muted)' }}>Paste a link above to preview viral clips</p>
          </div>
        )}
      </div>
    </div>
  );
}
