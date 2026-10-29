import React from 'react';

/**
 * ClipsList Component
 * Displays AI-generated high-reach vertical clips with retention forecasting,
 * individual 1-click uploads to YouTube Shorts, and quick multi-part generators.
 * 100% Free & Open: No admin restrictions.
 */
export default function ClipsList({ 
  clips, 
  selectedIndex, 
  onSelectClip, 
  onLoadMore, 
  onUploadSingleClip,
  uploadingClipId,
  clipUploads = {},
  onShowToast
}) {
  return (
    <div className="card clips-feed-card" style={{ marginBottom: '1.5rem' }}>
      <div className="clips-feed-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
            High-Reach Highlight Clips
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Detected dialogue spikes & curiosity gaps across the timeline ({clips.length} Total Clips)
          </p>
        </div>

        {/* Quick Batch Generators for 20+ Clips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn-load-more" 
            onClick={() => onLoadMore(20)}
            title="Generate a series of 20+ clips ready for batch uploading"
            style={{
              background: 'linear-gradient(135deg, #DE1110 0%, #255DCE 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              boxShadow: '0 2px 10px rgba(37, 93, 206, 0.3)'
            }}
          >
            <span>⚡ +20 Clips Series</span>
          </button>
          <button 
            type="button"
            className="btn-load-more" 
            onClick={() => onLoadMore(6)}
            title="Generate 6 more clips"
          >
            <span>+6 More</span>
          </button>
        </div>
      </div>

      {clips.length === 0 ? (
        <div className="clips-empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎬</div>
          <p style={{ fontWeight: 700, margin: 0 }}>No Clips Generated Yet</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Enter a YouTube/Kick/Twitch URL or upload a file above to auto-detect viral hooks.
          </p>
        </div>
      ) : (
        <div className="clips-grid">
          {clips.map((clip, index) => {
            const isSelected = selectedIndex === index;
            const duration = (clip.endSec - clip.startSec) || 60;
            const uploadState = clipUploads[clip.id] || {};
            const isUploading = uploadingClipId === clip.id || uploadState.uploading;
            const isUploaded = uploadState.uploaded;
            const shortsUrl = uploadState.shortsUrl;

            return (
              <div 
                key={clip.id || index}
                className={`clip-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectClip(index)}
                style={{ cursor: 'pointer' }}
              >
                <div className="clip-header-row">
                  <span className="clip-badge">
                    Clip #{clip.id || index + 1}
                  </span>
                  <span className="clip-score" title="Estimated Audience Retention">
                    🔥 {clip.score || 95}% Retention
                  </span>
                </div>

                <div className="clip-title">
                  {clip.title || `Curiosity Spike Part #${clip.id || index + 1}`}
                </div>

                <div className="clip-meta-row">
                  <div className="clip-timing">
                    <span>⏱️</span>
                    <span>{Math.floor(clip.startSec / 60)}:{(clip.startSec % 60).toString().padStart(2, '0')} - {Math.floor(clip.endSec / 60)}:{(clip.endSec % 60).toString().padStart(2, '0')}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({duration}s)</span>
                  </div>

                  <div className="clip-views">
                    <span>🚀 Forecast:</span>
                    <strong style={{ color: '#34d399' }}>{clip.projectedViews || '1.2M'}</strong>
                  </div>
                </div>

                {/* Upload Status / Action Row */}
                <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--card-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {isSelected ? '🎯 Selected for Preview' : 'Click to preview'}
                  </span>

                  <div>
                    {isUploaded && shortsUrl ? (
                      <a 
                        href={shortsUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: 'rgba(52, 211, 153, 0.15)',
                          color: '#34d399',
                          border: '1px solid #34d399',
                          borderRadius: '6px',
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        ✅ Live on Shorts
                      </a>
                    ) : (
                      <button 
                        type="button"
                        disabled={uploadingClipId != null}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUploadSingleClip(index);
                        }}
                        style={{
                          background: isUploading ? '#041E75' : 'linear-gradient(135deg, #DE1110 0%, #255DCE 100%)',
                          border: 'none',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: uploadingClipId != null ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 8px rgba(37, 93, 206, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        title={`Upload Clip #${clip.id || index + 1} to YouTube Shorts`}
                      >
                        {isUploading ? '⏳ Uploading...' : '🚀 Upload to YouTube'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
