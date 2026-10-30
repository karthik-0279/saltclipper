import React from 'react';

/**
 * YouTubeBar Component
 * Minimalist Black & White theme.
 * Controls Google Cloud Projects rotation status, automated Shorts upload toggle, and privacy status.
 * 100% Free & Open: No admin login restrictions or modal popups.
 */
export default function YouTubeBar({ 
  ytStatus, 
  autoUpload, 
  onToggleAutoUpload, 
  privacy, 
  onChangePrivacy, 
  onOpenProjectsManager,
  onShowToast,
  quota = null
}) {
  const activeHandle = ytStatus?.activeProfile?.projectName || quota?.activeProfileName || 'Google Cloud Project 1';
  const totalPoolRemaining = quota?.totalPoolRemaining ?? quota?.remainingUploads ?? 30;
  const totalPoolCapacity = quota?.totalPoolCapacity ?? 30;
  const remainingUnits = quota?.totalQuotaRemainingUnits ?? 50000;
  const projectsCount = quota?.totalProfilesCount ?? 5;

  const scrollToProjects = () => {
    if (onOpenProjectsManager) onOpenProjectsManager();
    const el = document.getElementById('projects-section') || document.getElementById('accounts-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="youtube-automation-bar">
      <div className="yt-bar-left">
        <div className="yt-logo-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#FFFFFF' }}>
            Google Cloud Projects Pipeline
          </span>
          <button
            type="button"
            onClick={scrollToProjects}
            style={{ 
              fontSize: '0.75rem', 
              background: 'var(--bg-subtle)', 
              color: '#FFFFFF', 
              border: '1px solid var(--card-border)',
              padding: '3px 10px', 
              borderRadius: '12px', 
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Click to view & manage 5 Google Cloud Console projects"
          >
            <span style={{ color: '#FFFFFF' }}>● Active:</span>
            <span>{activeHandle}</span>
          </button>
          {quota && (
            <button 
              type="button"
              onClick={scrollToProjects}
              style={{ 
                fontSize: '0.75rem', 
                background: quota.isCircuitBreakerOpen ? '#222222' : 'var(--bg-subtle)', 
                color: quota.isCircuitBreakerOpen ? '#AAAAAA' : '#FFFFFF', 
                border: '1px solid var(--card-border)',
                padding: '3px 10px', 
                borderRadius: '12px', 
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="Click to manage multi-project pool"
            >
              {quota.isCircuitBreakerOpen 
                ? `🛑 Quotas Full (${totalPoolRemaining}/${totalPoolCapacity})` 
                : `⚡ 5-Project Pool: ${totalPoolRemaining}/${totalPoolCapacity} Uploads (${remainingUnits} Units Left)`}
            </button>
          )}
        </div>
      </div>

      <div className="yt-bar-right">
        {/* Instant Auto-Upload Toggle */}
        <label 
          className="yt-toggle-label" 
          title="Automatically upload rendered clips directly to YouTube Shorts across rotated Google Cloud projects without manual clicks"
          style={{ cursor: 'pointer' }}
        >
          <input 
            type="checkbox" 
            checked={autoUpload} 
            onChange={(e) => onToggleAutoUpload(e.target.checked)} 
            style={{ accentColor: '#FFFFFF' }}
          />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
            Instant Auto-Upload: <strong style={{ color: autoUpload ? '#FFFFFF' : 'var(--text-dim)' }}>{autoUpload ? 'ACTIVE' : 'OFF'}</strong>
          </span>
        </label>

        {/* Visibility Setting */}
        <select 
          value={privacy} 
          onChange={(e) => onChangePrivacy(e.target.value)}
          className="yt-select"
          title="YouTube Video Privacy Setting"
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--card-border)',
            color: '#FFFFFF'
          }}
        >
          <option value="public">🌐 Public (Instant Viral Reach)</option>
          <option value="unlisted">🔗 Unlisted</option>
          <option value="private">🔒 Private</option>
        </select>

        {/* Manage Projects Button */}
        <button 
          type="button"
          className="btn-yt-connect"
          onClick={scrollToProjects}
          title="Scroll to Google Cloud Projects Manager"
          style={{
            background: '#FFFFFF',
            border: 'none',
            color: '#000000',
            fontWeight: 800,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer'
          }}
        >
          <span>☁ Manage 5 Projects</span>
        </button>
      </div>
    </section>
  );
}
