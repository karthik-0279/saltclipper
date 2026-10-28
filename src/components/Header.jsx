import React from 'react';

/**
 * Header Component
 * Displays brand logo, public access status, user identity badge,
 * admin toggle, and discreet administrator login portal.
 */
export default function Header({ 
  user, 
  isAdmin, 
  currentView, 
  onToggleView, 
  onLogout,
  onOpenAdminLogin 
}) {
  const userInitial = (user?.name || user?.email || 'G').charAt(0).toUpperCase();

  return (
    <header>
      <div className="logo">
        <div className="logo-icon">⚡</div>
        <span>AutoClip AI</span>
        <span className="logo-tag">Unlimited Reach Engine</span>
      </div>

      <div className="nav-status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {isAdmin ? (
          <>
            {/* Admin Profile Pill */}
            <div className="user-profile-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="user-avatar" style={{ background: '#ef4444' }}>{userInitial}</div>
              <span className="user-name">{user?.name || 'Administrator'}</span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.35))',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                textTransform: 'uppercase'
              }}>
                👑 Admin
              </span>
            </div>

            {/* Admin Console Switch Button */}
            <button 
              type="button"
              onClick={onToggleView}
              style={{
                background: currentView === 'admin' 
                  ? 'linear-gradient(135deg, var(--primary), #4f46e5)' 
                  : 'rgba(239, 68, 68, 0.15)',
                border: currentView === 'admin'
                  ? '1px solid var(--primary)'
                  : '1px solid rgba(239, 68, 68, 0.4)',
                color: currentView === 'admin' ? '#ffffff' : '#f87171',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
              title={currentView === 'admin' ? 'Switch to video clipping studio' : 'Open security & user oversight console'}
            >
              <span>{currentView === 'admin' ? '🎬' : '🛠️'}</span>
              <span>{currentView === 'admin' ? 'Studio' : 'Admin Console'}</span>
            </button>

            {/* Logout Trigger */}
            <button 
              id="btnLogout"
              className="btn-logout" 
              onClick={onLogout}
              title="Log out from administrator role"
            >
              <span>🚪</span>
              <span>Log Out</span>
            </button>
          </>
        ) : (
          <>
            {/* Public Access Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              <span>●</span>
              <span>Free Public Access</span>
            </div>

            {/* Discreet Admin Login Trigger */}
            <button
              type="button"
              onClick={onOpenAdminLogin}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
              title="Administrator login portal"
            >
              <span>🔒</span>
              <span>Admin Access</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
