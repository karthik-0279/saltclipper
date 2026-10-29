import React from 'react';

/**
 * YouTubeBar Component
 * Controls YouTube channel connection, automated Shorts upload toggle, and privacy status.
 * 100% Free & Open: No admin login restrictions.
 */
export default function YouTubeBar({ 
  ytStatus, 
  autoUpload, 
  onToggleAutoUpload, 
  privacy, 
  onChangePrivacy, 
  onOpenAccountsManager,
  onShowToast,
  quota = null
}) {
  const isConnected = ytStatus?.isConnected ?? true;
  const activeHandle = ytStatus?.activeProfile?.handle || quota?.activeProfileHandle || '@AutoClipMain';
  const totalPoolRemaining = quota?.totalPoolRemaining ?? quota?.remainingUploads ?? 85;
  const totalPoolCapacity = quota?.totalPoolCapacity ?? quota?.dailyLimit ?? 85;
  const profilesCount = quota?.totalProfilesCount ?? 5;

  return (
    <section className="youtube-automation-bar">
      <div className="yt-bar-left">
        <div className="yt-logo-badge">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#DE1110">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
            YouTube Shorts Pipeline
          </span>
          <button
            type="button"
            onClick={onOpenAccountsManager}
            style={{ 
              fontSize: '0.75rem', 
              background: 'rgba(37, 93, 206, 0.25)', 
              color: '#82aaff', 
              border: '1px solid rgba(37, 93, 206, 0.5)',
              padding: '3px 10px', 
              borderRadius: '12px', 
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Click to view & manage rotation accounts"
          >
            <span>● Active:</span>
            <span>{activeHandle}</span>
          </button>
          {quota && (
            <button 
              type="button"
              onClick={onOpenAccountsManager}
              style={{ 
                fontSize: '0.75rem', 
                background: quota.isCircuitBreakerOpen ? 'rgba(222,17,16,0.2)' : 'rgba(37, 93, 206, 0.2)', 
                color: quota.isCircuitBreakerOpen ? '#ff5e5d' : '#34d399', 
                border: `1px solid ${quota.isCircuitBreakerOpen ? 'rgba(222,17,16,0.4)' : 'rgba(37, 93, 206, 0.35)'}`,
                padding: '3px 10px', 
                borderRadius: '12px', 
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="Click to manage multi-account pool"
            >
              {quota.isCircuitBreakerOpen 
                ? `🛑 Quotas Full (${totalPoolRemaining}/${totalPoolCapacity})` 
                : `⚡ Pool: ${totalPoolRemaining}/${totalPoolCapacity} Left (${profilesCount} Accounts)`}
            </button>
          )}
        </div>
      </div>

      <div className="yt-bar-right">
        {/* Auto-Upload Toggle - 100% Unrestricted */}
        <label 
          className="yt-toggle-label" 
          title="Automatically upload rendered clips directly to YouTube Shorts with intelligent account rotation"
          style={{ cursor: 'pointer' }}
        >
          <input 
            type="checkbox" 
            checked={autoUpload} 
            onChange={(e) => onToggleAutoUpload(e.target.checked)} 
          />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
            Auto-Upload Shorts: <strong style={{ color: autoUpload ? '#34d399' : 'var(--text-dim)' }}>{autoUpload ? 'ON' : 'OFF'}</strong>
          </span>
        </label>

        {/* Visibility Setting - 100% Unrestricted */}
        <select 
          value={privacy} 
          onChange={(e) => onChangePrivacy(e.target.value)}
          className="yt-select"
          title="YouTube Video Privacy Setting"
        >
          <option value="public">🌐 Public (Instant Viral Reach)</option>
          <option value="unlisted">🔗 Unlisted</option>
          <option value="private">🔒 Private</option>
        </select>

        {/* Manage Accounts Button */}
        <button 
          type="button"
          className="btn-yt-connect"
          onClick={onOpenAccountsManager}
          title="Open Multi-Account YouTube Manager"
          style={{
            background: 'linear-gradient(135deg, #DE1110 0%, #255DCE 100%)',
            border: 'none',
            color: '#FFFFFF',
            fontWeight: 800
          }}
        >
          <span>👥 Manage Accounts</span>
        </button>
      </div>
    </section>
  );
}
