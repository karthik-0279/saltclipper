import React, { useState } from 'react';

/**
 * VideoInput Component
 * Supports pasting YouTube/Kick/Twitch/TikTok links or uploading local video files,
 * with 3 selectable operational modes.
 * Styled with Muted Sage Gray, Warm Cream Beige, and Deep Burgundy.
 */
export default function VideoInput({ 
  mode, 
  onSelectMode, 
  onAnalyzeUrl, 
  onSelectLocalFile, 
  isAnalyzing 
}) {
  const [url, setUrl] = useState('');
  const [inputType, setInputType] = useState('url'); // 'url' | 'file'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    onAnalyzeUrl(url.trim());
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectLocalFile(file);
    }
  };

  return (
    <section className="card input-box">
      {/* 3 Selectable Processing Modes */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.85rem' }}>
          🎯 Select Pipeline Action:
        </div>
        <div className="mode-cards-grid">
          {/* Mode 1: Highlights */}
          <div 
            className={`mode-card ${mode === 'highlights' ? 'active' : ''}`}
            onClick={() => onSelectMode('highlights')}
          >
            <div className="mode-title">
              <span>🌟</span>
              <span>1. Clips of Highlights</span>
            </div>
            <div className="mode-desc">
              AI detects high-retention viral moments, dialogue spikes, and curiosity loops (60s–70s clips).
            </div>
          </div>

          {/* Mode 2: Whole Video Sequential Clips */}
          <div 
            className={`mode-card mode-card-whole ${mode === 'whole_video' ? 'active' : ''}`}
            onClick={() => onSelectMode('whole_video')}
          >
            <div className="mode-title">
              <span>🎬</span>
              <span>2. Clips of Whole Video</span>
            </div>
            <div className="mode-desc">
              Slices the entire video sequentially from 00:00 to end into continuous 60s–70s parts.
            </div>
          </div>

          {/* Mode 3: Download Original Full MP4 */}
          <div 
            className={`mode-card mode-card-dl ${mode === 'download_whole' ? 'active' : ''}`}
            onClick={() => onSelectMode('download_whole')}
          >
            <div className="mode-title">
              <span>📥</span>
              <span>3. Download Whole Video</span>
            </div>
            <div className="mode-desc">
              Direct download of the complete full-length original source video file in high quality HD.
            </div>
          </div>
        </div>
      </div>

      {/* Input Mode Selector */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.1rem' }}>
        <button 
          type="button"
          onClick={() => setInputType('url')}
          style={{
            background: inputType === 'url' ? 'var(--primary)' : 'var(--bg-warm)',
            border: `1.5px solid ${inputType === 'url' ? 'var(--primary)' : 'var(--card-border)'}`,
            color: inputType === 'url' ? '#FFFFFF' : 'var(--text-muted)',
            padding: '0.5rem 1.15rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: inputType === 'url' ? '0 2px 8px var(--primary-glow)' : 'none'
          }}
        >
          🔗 Paste Video Link
        </button>
        <button 
          type="button"
          onClick={() => setInputType('file')}
          style={{
            background: inputType === 'file' ? 'var(--primary)' : 'var(--bg-warm)',
            border: `1.5px solid ${inputType === 'file' ? 'var(--primary)' : 'var(--card-border)'}`,
            color: inputType === 'file' ? '#FFFFFF' : 'var(--text-muted)',
            padding: '0.5rem 1.15rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: inputType === 'file' ? '0 2px 8px var(--primary-glow)' : 'none'
          }}
        >
          📁 Upload Local Video File
        </button>
      </div>

      {inputType === 'url' ? (
        <form onSubmit={handleSubmit} className="url-input-wrapper">
          <span style={{ fontSize: '1.25rem', color: 'var(--sage)' }}>🔗</span>
          <input 
            type="text" 
            className="url-input" 
            placeholder="Paste YouTube, Kick, Twitch, TikTok, or MP4 link here..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="btn-generate" disabled={isAnalyzing}>
            <span>{isAnalyzing ? '⏳' : '🧠'}</span>
            <span>{isAnalyzing ? 'Analyzing Video...' : 'Analyze & Generate Clips'}</span>
          </button>
        </form>
      ) : (
        <div 
          style={{
            border: '2px dashed var(--sage)',
            background: 'var(--sage-light)',
            borderRadius: 'var(--radius-md)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => document.getElementById('localFileInput').click()}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>🎬</div>
          <p style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1rem' }}>Click to browse or drag & drop MP4 / WebM</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>Supports all standard video formats up to 4K resolution</p>
          <input 
            type="file" 
            id="localFileInput" 
            accept="video/*" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
          />
        </div>
      )}
    </section>
  );
}
