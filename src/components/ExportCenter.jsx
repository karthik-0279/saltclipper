import React from 'react';

/**
 * ExportCenter Component
 * Controls aspect ratio formatting (9:16 mobile vs 16:9 widescreen),
 * single-clip rendering/download, and the intelligent 20+ clip batch upload pipeline.
 * 100% Free & Open: No admin restrictions.
 */
export default function ExportCenter({
  clips = [],
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
  batchStatus
}) {
  const clipsCount = clips.length;

  return (
    <div className="card export-controls-card">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-heading)' }}>
        Render & Multi-Account Batch Queue
      </h2>

      {/* Select Aspect Ratio */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          📐 Framing Canvas:
        </div>
        <div className="export-grid">
          {/* 9:16 Mobile Vertical */}
          <div 
            className={`export-card ${ratio === '9:16' ? 'selected' : ''}`}
            onClick={() => onChangeRatio('9:16')}
            style={{ cursor: 'pointer' }}
          >
            <div className="export-title">
              <span>📱</span>
              <span>9:16 Full-Bleed Vertical</span>
            </div>
            <div className="export-desc">
              Reframed for YouTube Shorts, Instagram Reels, and TikTok.
            </div>
          </div>

          {/* 16:9 Landscape */}
          <div 
            className={`export-card ${ratio === '16:9' ? 'selected' : ''}`}
            onClick={() => onChangeRatio('16:9')}
            style={{ cursor: 'pointer' }}
          >
            <div className="export-title">
              <span>🖥️</span>
              <span>16:9 Standard Landscape</span>
            </div>
            <div className="export-desc">
              Padded letterbox format for standard YouTube videos and web monitors.
            </div>
          </div>
        </div>
      </div>

      {/* Single Clip Rendering Progress Banner */}
      {isRendering && (
        <div className="render-progress-card" style={{ marginBottom: '1rem', background: 'rgba(2, 24, 97, 0.7)', border: '1.5px solid #255DCE', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 700, color: '#82aaff' }}>⚡ Slicing & Encoding Video...</span>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{renderProgress}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <div style={{ width: `${renderProgress}%`, height: '100%', background: 'linear-gradient(90deg, #DE1110, #255DCE)', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: '#8DA4D0' }}>{renderStatusText}</div>
        </div>
      )}

      {/* Intelligent Batch Queue Worker Progress Banner (Supports 20+ Clips) */}
      {batchStatus && (
        <div className="render-progress-card" style={{
          marginBottom: '1.25rem',
          background: 'rgba(2, 24, 97, 0.85)',
          border: `1.5px solid ${batchStatus.status === 'ERROR' ? '#DE1110' : '#255DCE'}`,
          padding: '1.2rem',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(2, 24, 97, 0.7)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {batchStatus.status === 'COMPLETED' ? '🎉' : (batchStatus.status === 'HALTED' ? '🛑' : '⚡')}
              </span>
              <strong style={{ color: '#FFFFFF', fontSize: '0.92rem' }}>
                {batchStatus.status === 'COMPLETED'
                  ? `Upload Series Complete (${batchStatus.uploadedClips?.length || 0}/${batchStatus.totalParts} Clips)!`
                  : `Batch Queue Running: Part ${batchStatus.currentPart || 1} of ${batchStatus.totalParts || clipsCount}`}
              </strong>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'rgba(37, 93, 206, 0.3)',
              color: '#82aaff',
              border: '1px solid rgba(37, 93, 206, 0.5)'
            }}>
              {batchStatus.progress || 0}% Complete
            </span>
          </div>

          <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.65rem' }}>
            <div style={{ width: `${batchStatus.progress || 0}%`, height: '100%', background: 'linear-gradient(90deg, #DE1110, #255DCE, #34d399)', transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ fontSize: '0.8rem', color: '#8DA4D0', marginBottom: '0.75rem' }}>
            {batchStatus.step}
          </div>

          {/* List of Uploaded Clips with Direct Links */}
          {batchStatus.uploadedClips && batchStatus.uploadedClips.length > 0 && (
            <div style={{
              background: 'rgba(2, 11, 46, 0.6)',
              borderRadius: '8px',
              padding: '0.75rem',
              maxHeight: '160px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#82aaff', textTransform: 'uppercase' }}>
                Uploaded Parts ({batchStatus.uploadedClips.length}):
              </div>
              {batchStatus.uploadedClips.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#F0F4FF' }}>
                    Part #{item.part}: {item.title || `Clip #${item.clipId}`}
                  </span>
                  <a 
                    href={item.shortsUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: '#34d399', textDecoration: 'none', fontWeight: 700 }}
                  >
                    View Shorts ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Successful Single Upload Result Link */}
      {lastUploadResult?.shortsUrl && (
        <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid #34d399', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#34d399', fontWeight: 800, fontSize: '0.88rem' }}>🎉 Live on YouTube Shorts!</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>URL: {lastUploadResult.shortsUrl}</div>
          </div>
          <a 
            href={lastUploadResult.shortsUrl} 
            target="_blank" 
            rel="noreferrer"
            style={{ background: '#34d399', color: '#020B2E', padding: '0.4rem 0.85rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', textDecoration: 'none' }}
          >
            Watch Now ↗
          </a>
        </div>
      )}

      {/* 1-Click Upload ALL Generated Clips (20+ Clips Batch Queue) */}
      <button 
        id="btnUploadAllYT"
        className="btn-upload-all-yt"
        onClick={onUploadAllToYouTube}
        disabled={isBatchUploading || isRendering || clipsCount === 0}
        style={{
          cursor: (isBatchUploading || isRendering || clipsCount === 0) ? 'not-allowed' : 'pointer',
          background: 'linear-gradient(135deg, #DE1110 0%, #ff3b30 40%, #255DCE 100%)',
          boxShadow: '0 6px 20px rgba(222, 17, 16, 0.45)',
          padding: '1rem',
          fontSize: '1rem',
          fontWeight: 800
        }}
        title="Slice and upload all generated clips sequentially with smart multi-account failover"
      >
        <span>⚡</span>
        <span>
          {isBatchUploading
            ? `Continuous Queue Active (${batchStatus?.currentPart || 1}/${clipsCount})...` 
            : `1-Click Upload Series of ${clipsCount} Clips to YouTube Shorts (Zero Waste)`}
        </span>
      </button>

      {/* Single Clip Download Button */}
      <button 
        className="btn-download-main" 
        onClick={onStartRender}
        disabled={isRendering || isBatchUploading || !currentClip}
        style={{ cursor: (isRendering || isBatchUploading || !currentClip) ? 'not-allowed' : 'pointer' }}
        title="Render and download high-bitrate MP4"
      >
        <span>⬇️</span>
        <span>
          {isRendering ? `Rendering Active Clip (${renderProgress}%)...` : `Download Active ${ratio} MP4 Video`}
        </span>
      </button>

      {/* Direct YouTube Shorts Upload Button for Active Clip */}
      <button 
        className="btn-upload-yt-direct"
        onClick={onManualUploadYT}
        disabled={isRendering || isBatchUploading || !currentClip}
        style={{ cursor: (isRendering || isBatchUploading || !currentClip) ? 'not-allowed' : 'pointer' }}
        title="Publish active clip directly to Shorts"
      >
        <span>🚀</span>
        <span>Publish Current Active Clip to Shorts</span>
      </button>
    </div>
  );
}
