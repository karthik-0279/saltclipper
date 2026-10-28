import React from 'react';

/**
 * YouTubeBar Component
 * Controls YouTube channel connection, automated Shorts upload toggle, and privacy status.
 * Integrated with Multi-Account YouTube Profile Rotation (Zero /api/ network calls).
 * Styled with Muted Sage Gray, Warm Cream Beige, and Deep Burgundy.
 */
export default function YouTubeBar({ 
  ytStatus, 
  autoUpload, 
  onToggleAutoUpload, 
  privacy, 
  onChangePrivacy, 
  onOpenConfig,
  isAdmin = false,
  onShowToast,
  quota = null
}) {
  const isConnected = ytStatus?.isConnected;
  const activeHandle = ytStatus?.activeProfile?.handle || quota?.activeProfileHandle || '@AutoClipMain';
  const totalPoolRemaining = quota?.totalPoolRemaining ?? quota?.remainingUploads ?? 85;
  const totalPoolCapacity = quota?.totalPoolCapacity ?? quota?.dailyLimit ?? 85;
  const profilesCount = quota?.totalProfilesCount ?? 5;

  const handleConnect = () => {
    if (!isAdmin) {
      if (onShowToast) {
        onShowToast('🔒 Administrator permission required to manage YouTube connections.');
      }
      return;
    }

    if (onShowToast) {
      onShowToast(`✅ Connected to YouTube Shorts Pool via ${activeHandle} (${profilesCount} Accounts Active)`);
    }
  };

  return (
    <section className="youtube-automation-bar">
      <div className="yt-bar-left">
        <div className="yt-logo-badge">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#581827">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
            YouTube Shorts Pipeline
          </span>
          <span 
            style={{ 
              fontSize: '0.75rem', 
              background: 'var(--sage-light)', 
              color: 'var(--sage-dark)', 
              border: '1px solid var(--sage)',
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontWeight: 700 
            }}
            title={`Active Rotation Profile: ${activeHandle}`}
          >
            {activeHandle}
          </span>
          {quota && (
            <span 
              style={{ 
                fontSize: '0.75rem', 
                background: quota.isCircuitBreakerOpen ? 'rgba(88,24,39,0.1)' : 'var(--sage-light)', 
                color: quota.isCircuitBreakerOpen ? 'var(--primary)' : 'var(--sage-dark)', 
                border: `1px solid ${quota.isCircuitBreakerOpen ? 'rgba(88,24,39,0.3)' : 'var(--sage)'}`,
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontWeight: 700 
              }}
              title={`Multi-Account Pool: ${totalPoolRemaining}/${totalPoolCapacity} uploads remaining across ${profilesCount} configured profiles.`}
            >
              {quota.isCircuitBreakerOpen 
                ? `🛑 Quotas Full (${totalPoolRemaining}/${totalPoolCapacity})` 
                : `⚡ Pool: ${totalPoolRemaining}/${totalPoolCapacity} Left (${profilesCount} Accounts)`}
            </span>
          )}
        </div>
      </div>

      <div className="yt-bar-right">
        {/* Auto-Upload Toggle */}
        <label 
          className="yt-toggle-label" 
          title={isAdmin ? "Automatically upload rendered clips directly to YouTube Shorts with intelligent account rotation" : "Admin permission required to toggle automatic uploads"}
          style={{ opacity: isAdmin ? 1 : 0.7, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
        >
          <input 
            type="checkbox" 
            checked={autoUpload} 
            disabled={!isAdmin}
            onChange={(e) => onToggleAutoUpload(e.target.checked)} 
          />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
            Auto-Upload Shorts: <strong style={{ color: autoUpload ? 'var(--sage-dark)' : 'var(--text-dim)' }}>{autoUpload ? 'ON' : 'OFF'}</strong>
            {!isAdmin && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', marginLeft: '4px', fontWeight: 700 }}>[Admin Only]</span>}
          </span>
        </label>

        {/* Privacy Selector */}
        <select 
          className="yt-select" 
          value={privacy} 
          disabled={!isAdmin}
          onChange={(e) => onChangePrivacy(e.target.value)}
          title={isAdmin ? "YouTube Video Privacy Setting" : "Admin permission required to change privacy settings"}
          style={{ opacity: isAdmin ? 1 : 0.7, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
        >
          <option value="private">🔒 Private (Draft)</option>
          <option value="public">🌐 Public (Instant)</option>
          <option value="unlisted">🔗 Unlisted (Link)</option>
        </select>

        {/* Connect Action Button */}
        <button 
          className={`btn-yt-connect ${isConnected ? 'connected' : ''}`}
          onClick={handleConnect}
          style={{ opacity: isAdmin ? 1 : 0.8 }}
          title={isAdmin ? `Connected to multi-account pool via ${activeHandle}` : "Admin access required to configure YouTube accounts"}
        >
          <span>{isConnected ? '✅' : '🔗'}</span>
          <span>{isConnected ? `${activeHandle} Connected` : (isAdmin ? 'Connect YouTube' : 'Connect (Admin Only)')}</span>
        </button>

        {/* OAuth Credentials Config Gear (Admin Only) */}
        {isAdmin && (
          <button 
            className="btn-yt-config" 
            onClick={onOpenConfig} 
            title="Configure YouTube Multi-Account OAuth Settings"
          >
            <span>⚙️</span>
          </button>
        )}
      </div>
    </section>
  );
}
