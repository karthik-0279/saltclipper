import React from 'react';

/**
 * ClipsList Component
 * Displays ranked viral clips with virality scores, projected reach numbers,
 * interactive watch preview, and individual One-by-One "Upload to YouTube" buttons on each clip.
 * Styled with Muted Sage Gray, Warm Cream Beige, and Deep Burgundy.
 */
export default function ClipsList({ 
  clips, 
  selectedIndex, 
  onSelectClip, 
  onLoadMore,
  onUploadSingleClip,
  uploadingClipId,
  clipUploads = {},
  isAdmin = false,
  onShowToast
}) {
  if (!clips || clips.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: 'var(--sage)' }}>🔗</div>
        <div style={{ fontSize: '1.05rem', color: 'var(--text-heading)', fontWeight: 800 }}>No Video Loaded Yet</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Paste any video link or upload an MP4 above to generate unlimited high-retention clips!
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>
          ✨ AI Viral Highlights ({clips.length} Clips)
        </h3>
        <span style={{ 
          fontSize: '0.75rem', 
          background: 'var(--sage-light)', 
          border: '1px solid var(--sage)', 
          color: 'var(--sage-dark)', 
          padding: '0.25rem 0.75rem', 
          borderRadius: '20px', 
          fontWeight: 700 
        }}>
          Strictly 60s – 70s
        </span>
      </div>

      <div className="clips-list-vertical">
        {clips.map((clip, index) => {
          const isSelected = index === selectedIndex;
          const duration = Math.max(1, clip.endSec - clip.startSec);
          const isUploading = uploadingClipId === clip.id;
          const uploadInfo = clipUploads[clip.id];

          return (
            <div 
              key={clip.id || index}
              className={`clip-card ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectClip(index)}
            >
              <div className="clip-header-row">
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                  Clip #{clip.id || index + 1}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="score-badge">🔥 {clip.score || '98'}/100</span>
                  <span className="reach-badge">🚀 {clip.projectedViews || '1.5M'} Views</span>
                </div>
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.45rem', lineHeight: 1.4 }}>
                {clip.title}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  ⏱️ {duration}s Duration [{clip.startSec}s - {clip.endSec}s]
                </span>

                {/* Actions: Watch Clip + 1-by-1 Upload to YouTube */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={() => onSelectClip(index)}
                    style={{
                      background: isSelected ? 'var(--primary)' : 'var(--bg-subtle)',
                      border: isSelected ? 'none' : '1px solid var(--card-border)',
                      color: isSelected ? '#FFFFFF' : 'var(--text)',
                      borderRadius: '6px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isSelected ? '▶️ Watching' : 'Watch'}
                  </button>

                  {/* Individual 1-by-1 Upload Button */}
                  {uploadInfo ? (
                    <a 
                      href={uploadInfo.shortsUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: 'var(--sage-light)',
                        border: '1px solid var(--sage)',
                        color: 'var(--sage-dark)',
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
                      disabled={!isAdmin || uploadingClipId != null}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAdmin) {
                          if (onShowToast) onShowToast('🔒 Admin permission required to upload clips to YouTube.');
                          return;
                        }
                        onUploadSingleClip(index);
                      }}
                      style={{
                        background: !isAdmin
                          ? 'var(--bg-subtle)'
                          : (isUploading ? 'var(--primary-light)' : 'var(--primary-gradient)'),
                        border: !isAdmin ? '1px solid var(--card-border)' : 'none',
                        color: !isAdmin ? 'var(--text-dim)' : '#FFFFFF',
                        borderRadius: '6px',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: (!isAdmin || uploadingClipId != null) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: isAdmin ? '0 2px 8px var(--primary-glow)' : 'none',
                        opacity: !isAdmin ? 0.75 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      title={isAdmin ? `Upload Clip #${clip.id || index + 1} individually to YouTube Shorts` : "Admin privileges required to upload to YouTube"}
                    >
                      {!isAdmin ? '🔒 Admin Only' : (isUploading ? '⏳ Uploading...' : '🚀 Upload to YouTube')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Infinite Batch Generator */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '0.85rem' }}>
        <button 
          className="btn-download-main" 
          style={{ 
            background: 'var(--card-bg)', 
            border: '1.5px solid var(--sage)', 
            color: 'var(--text-heading)', 
            padding: '0.7rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
          onClick={() => onLoadMore(5)}
        >
          ⚡ Extract 5 More Clips
        </button>
        <button 
          className="btn-download-main" 
          style={{ 
            background: 'var(--card-bg)', 
            border: '1.5px solid var(--sage)', 
            color: 'var(--text-heading)', 
            padding: '0.7rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
          onClick={() => onLoadMore(10)}
        >
          🔥 Extract 10 More Clips
        </button>
      </div>
    </div>
  );
}
