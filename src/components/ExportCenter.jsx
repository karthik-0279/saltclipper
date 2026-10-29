import React from 'react';

/**
 * ExportCenter Component
 * Controls format ratio (9:16 vs 16:9), single-clip render/download,
 * 1-click active clip YouTube upload, and 1-Click Upload ALL Generated Clips to YouTube Shorts.
 * Styled with Muted Sage Gray, Warm Cream Beige, and Deep Burgundy.
 */
export default function ExportCenter({ 
  clips,
  currentClip, 
  ratio, 
  onChangeRatio, 
  onStartRender, 
  onManualUploadYT,
  onUploadAllToYouTube,
  isRendering, 
  renderProgress, 
  renderStatusText,
  lastUploadResult,
  isBatchUploading,
  batchStatus,
  isAdmin = false
}) {
  const clipsCount = clips?.length || 0;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
          💾 Download & Shorts Publishing Center
        </h3>
        {!isAdmin && (
          <span style={{ 
            fontSize: '0.72rem', 
            background: 'rgba(88, 24, 39, 0.08)', 
            color: 'var(--primary)', 
            border: '1px solid rgba(88, 24, 39, 0.25)', 
            padding: '0.25rem 0.6rem', 
            borderRadius: '6px', 
            fontWeight: 700 
          }}>
            🔒 View-Only Mode
          </span>
        )}
      </div>

      {!isAdmin && (
        <div style={{ 
          background: 'rgba(88, 24, 39, 0.06)', 
          border: '1px solid rgba(88, 24, 39, 0.2)', 
          borderRadius: '8px', 
          padding: '0.85rem 1.1rem', 
          marginBottom: '1.25rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem' 
        }}>
          <span style={{ fontSize: '1.25rem' }}>🛡️</span>
          <div>
            <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.85rem' }}>Administrator Privileges Required</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
              You are signed in as a regular viewer. Renders, batch uploads, and publishing controls are unlocked in Admin mode.
            </div>
          </div>
        </div>
      )}

      {/* Target Format Ratio */}
      <div className="export-options">
        <div 
          className={`export-card ${ratio === '9:16' ? 'selected' : ''}`}
          onClick={() => onChangeRatio('9:16')}
        >
          <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: '4px', color: 'var(--text-heading)' }}>
            📱 9:16 Mobile Vertical
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            1080x1920 with blurred backdrop for Shorts, TikTok & Reels
          </div>
        </div>

        <div 
          className={`export-card ${ratio === '16:9' ? 'selected' : ''}`}
          onClick={() => onChangeRatio('16:9')}
        >
          <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: '4px', color: 'var(--text-heading)' }}>
            💻 16:9 Landscape
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            1920x1080 Standard widescreen format for desktop YouTube
          </div>
        </div>
      </div>

      {/* Real-time Single Render Progress Card */}
      {isRendering && (
        <div style={{ background: 'var(--card-bg)', border: '1.5px solid var(--primary)', borderRadius: '8px', padding: '1.1rem', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(88, 24, 39, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-heading)' }}>
            <span>{renderStatusText}</span>
            <span style={{ color: 'var(--primary)' }}>{renderProgress}%</span>
          </div>
          <div style={{ height: '7px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${renderProgress}%`, height: '100%', background: 'var(--primary-gradient)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* Real-time BATCH Upload Status Panel */}
      {isBatchUploading && batchStatus && (
        <div className="batch-status-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
              ⚡ Batch Uploading All Clips ({batchStatus.currentPart || 0}/{batchStatus.totalParts || clipsCount})
            </span>
            <span style={{ fontWeight: 800, color: 'var(--sage-dark)', fontFamily: 'var(--font-mono)' }}>
              {batchStatus.progress || 0}%
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
            {batchStatus.step || 'Processing batch uploads with multi-account rotation...'}
          </div>

          <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
            <div style={{ width: `${batchStatus.progress || 0}%`, height: '100%', background: 'linear-gradient(90deg, #DE1110, #255DCE)', transition: 'width 0.4s ease' }} />
          </div>

          {/* List of uploaded parts with links */}
          {batchStatus.uploadedClips && batchStatus.uploadedClips.length > 0 && (
            <div className="batch-links-grid">
              {batchStatus.uploadedClips.map((item, idx) => (
                <div key={idx} className="batch-link-item">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sage-dark)' }}>
                    ✅ Part {item.part}: {item.title}
                  </span>
                  <a 
                    href={item.shortsUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'underline', fontWeight: 700 }}
                  >
                    Watch Shorts
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dedicated YouTube Upload Success Card */}
      {lastUploadResult && !isBatchUploading && (
        <div style={{ background: 'var(--sage-light)', border: '1.5px solid var(--sage)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ color: 'var(--sage-dark)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>
            ⚡ LIVE ON YOUTUBE SHORTS!
          </div>
          <a 
            href={lastUploadResult.shortsUrl} 
            target="_blank" 
            rel="noreferrer"
            style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.85rem', fontWeight: 700 }}
          >
            ▶️ Watch Video on YouTube ({lastUploadResult.shortsUrl})
          </a>
        </div>
      )}

      {/* 1-Click Upload ALL Generated Clips to YouTube Shorts */}
      <button 
        id="btnUploadAllYT"
        className="btn-upload-all-yt"
        onClick={onUploadAllToYouTube}
        disabled={!isAdmin || isBatchUploading || isRendering || clipsCount === 0}
        style={{ opacity: !isAdmin ? 0.65 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
        title={isAdmin ? "Slice and upload every generated highlight sequentially to YouTube Shorts" : "Admin privileges required to trigger batch uploads"}
      >
        <span>⚡</span>
        <span>
          {!isAdmin ? `🔒 Admin Only: Batch Upload All ${clipsCount} Clips` : (
            isBatchUploading
              ? `Uploading Series (${batchStatus?.currentPart || 1}/${clipsCount})...` 
              : `1-Click Upload All ${clipsCount} Clips to YouTube Shorts`
          )}
        </span>
      </button>

      {/* Main Single Download Button */}
      <button 
        className="btn-download-main" 
        onClick={onStartRender}
        disabled={!isAdmin || isRendering || isBatchUploading || !currentClip}
        style={{ opacity: !isAdmin ? 0.65 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
        title={isAdmin ? "Render and download MP4" : "Admin privileges required to render clips"}
      >
        <span>⬇️</span>
        <span>
          {!isAdmin ? `🔒 Admin Only: Download Active MP4 Video` : (
            isRendering ? `Rendering Active Clip (${renderProgress}%)...` : `Download Active ${ratio} MP4 Video`
          )}
        </span>
      </button>

      {/* Direct YouTube Shorts Upload Button for Active Clip */}
      <button 
        className="btn-upload-yt-direct"
        onClick={onManualUploadYT}
        disabled={!isAdmin || isRendering || isBatchUploading || !currentClip}
        style={{ opacity: !isAdmin ? 0.65 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
        title={isAdmin ? "Publish current active clip directly to Shorts" : "Admin privileges required to upload to YouTube"}
      >
        <span>🚀</span>
        <span>{!isAdmin ? '🔒 Admin Only: Publish to Shorts' : 'Publish Current Active Clip to Shorts'}</span>
      </button>
    </div>
  );
}
