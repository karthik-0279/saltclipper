import React from 'react';

/**
 * ClipsList Component
 * Displays ranked viral clips with virality scores, projected reach numbers,
 * interactive watch preview, AND individual One-by-One "Upload to YouTube" buttons on each clip.
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
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔗</div>
        <div style={{ fontSize: '1rem', color: '#cbd5e1', fontWeight: 700 }}>No Video Loaded Yet</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '4px' }}>
          Paste any link or upload an MP4 above to generate unlimited high-reach clips!
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
          ✨ AI Viral Highlights ({clips.length} Clips)
        </h3>
        <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700 }}>
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
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Clip #{clip.id || index + 1}</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <span className="score-badge">🔥 {clip.score || '98'}/100</span>
                  <span className="reach-badge">🚀 {clip.projectedViews || '1.5M'} Views</span>
                </div>
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
                {clip.title}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  ⏱️ {duration}s Duration [{clip.startSec}s - {clip.endSec}s]
                </span>

                {/* Actions: Watch Clip + 1-by-1 Upload to YouTube */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={() => onSelectClip(index)}
                    style={{
                      background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
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
                        background: 'rgba(16,185,129,0.2)',
                        border: '1px solid rgba(16,185,129,0.4)',
                        color: '#34d399',
                        borderRadius: '6px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
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
                          ? 'rgba(100,116,139,0.2)'
                          : (isUploading ? 'rgba(239,68,68,0.4)' : 'linear-gradient(135deg, #ef4444, #dc2626)'),
                        border: !isAdmin ? '1px solid rgba(100,116,139,0.3)' : 'none',
                        color: !isAdmin ? '#94a3b8' : '#fff',
                        borderRadius: '6px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: (!isAdmin || uploadingClipId != null) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: isAdmin ? '0 2px 8px rgba(239,68,68,0.3)' : 'none',
                        opacity: !isAdmin ? 0.7 : 1
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
      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '0.75rem' }}>
        <button 
          className="btn-download-main" 
          style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid var(--primary)', color: '#fff', padding: '0.65rem' }}
          onClick={() => onLoadMore(5)}
        >
          ⚡ Extract 5 More Clips
        </button>
        <button 
          className="btn-download-main" 
          style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid var(--primary)', color: '#fff', padding: '0.65rem' }}
          onClick={() => onLoadMore(10)}
        >
          🔥 Extract 10 More Clips
        </button>
      </div>
    </div>
  );
}
