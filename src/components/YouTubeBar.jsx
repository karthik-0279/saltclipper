import React from 'react';

/**
 * YouTubeBar Component
 * Controls YouTube channel connection, automated Shorts upload toggle, and privacy status.
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
  const channelTitle = ytStatus?.channel?.title;

  const handleConnect = () => {
    if (!isAdmin) {
      if (onShowToast) {
        onShowToast('🔒 Permission Denied: Only Administrator accounts can connect YouTube.');
      }
      return;
    }
    // Open Google OAuth consent in dedicated popup window
    const popup = window.open(
      '/api/auth/google',
      'ConnectYouTube',
      'width=600,height=720,status=no,resizable=yes'
    );
    if (!popup) {
      window.location.href = '/api/auth/google';
    }
  };

  return (
    <section className="youtube-automation-bar">
      <div className="yt-bar-left">
        <div className="yt-logo-badge">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#ff0000">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
            YouTube Shorts Direct Pipeline
          </span>
          {channelTitle && (
            <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              {channelTitle}
            </span>
          )}
          {quota && (
            <span 
              style={{ 
                fontSize: '0.75rem', 
                background: quota.isCircuitBreakerOpen ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.18)', 
                color: quota.isCircuitBreakerOpen ? '#f87171' : '#38bdf8', 
                border: `1px solid ${quota.isCircuitBreakerOpen ? 'rgba(239,68,68,0.4)' : 'rgba(56,189,248,0.3)'}`,
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontWeight: 700 
              }}
              title={quota.isCircuitBreakerOpen 
                ? `Circuit Breaker: ${quota.circuitBreakerReason}` 
                : `Safe Local Quota: ${quota.uploadsToday}/${quota.dailyLimit} used today. Stops before hitting Google 100 limit.`}
            >
              {quota.isCircuitBreakerOpen 
                ? `🛑 Breaker Tripped (${quota.uploadsToday}/${quota.dailyLimit})` 
                : `⚡ Quota: ${quota.remainingUploads}/${quota.dailyLimit} Safe Left`}
            </span>
          )}
        </div>
      </div>

      <div className="yt-bar-right">
        {/* Auto-Upload Toggle */}
        <label 
          className="yt-toggle-label" 
          title={isAdmin ? "Automatically upload rendered clips directly to your YouTube channel as Shorts" : "Admin permission required to toggle automatic uploads"}
          style={{ opacity: isAdmin ? 1 : 0.65, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
        >
          <input 
            type="checkbox" 
            checked={autoUpload} 
            disabled={!isAdmin}
            onChange={(e) => onToggleAutoUpload(e.target.checked)} 
          />
          <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
            Auto-Upload Shorts: <strong style={{ color: autoUpload ? '#10b981' : '#94a3b8' }}>{autoUpload ? 'ON' : 'OFF'}</strong>
            {!isAdmin && <span style={{ fontSize: '0.7rem', color: '#f59e0b', marginLeft: '4px' }}>[Admin Only]</span>}
          </span>
        </label>

        {/* Privacy Selector */}
        <select 
          className="yt-select" 
          value={privacy} 
          disabled={!isAdmin}
          onChange={(e) => onChangePrivacy(e.target.value)}
          title={isAdmin ? "YouTube Video Privacy Setting" : "Admin permission required to change privacy settings"}
          style={{ opacity: isAdmin ? 1 : 0.65, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
        >
          <option value="private">🔒 Private (Draft)</option>
          <option value="public">🌐 Public (Instant)</option>
          <option value="unlisted">🔗 Unlisted (Link)</option>
        </select>

        {/* Connect Action Button */}
        <button 
          className={`btn-yt-connect ${isConnected ? 'connected' : ''}`}
          onClick={handleConnect}
          style={{ opacity: isAdmin ? 1 : 0.75 }}
          title={isAdmin ? "Connect channel" : "Admin access required to connect YouTube"}
        >
          <span>{isConnected ? '✅' : '🔗'}</span>
          <span>{isConnected ? 'Channel Connected' : (isAdmin ? 'Connect YouTube' : 'Connect (Admin Only)')}</span>
        </button>

        {/* OAuth Credentials Config Gear (Admin Only) */}
        {isAdmin && (
          <button 
            className="btn-yt-config" 
            onClick={onOpenConfig} 
            title="Configure Google Cloud OAuth Client ID / Secret"
          >
            <span>⚙️</span>
          </button>
        )}
      </div>
    </section>
  );
}
