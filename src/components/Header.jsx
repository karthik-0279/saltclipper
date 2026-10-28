import React from 'react';

/**
 * Header Component
 * Displays brand logo, public access status, user identity badge,
 * admin toggle, and discreet administrator login portal.
 * Styled with Muted Sage Gray, Warm Cream Beige, and Deep Burgundy.
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
              <div className="user-avatar">{userInitial}</div>
              <span className="user-name" style={{ color: 'var(--text)', fontWeight: 700 }}>{user?.name || 'Administrator'}</span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                background: 'rgba(88, 24, 39, 0.1)',
                color: 'var(--primary)',
                border: '1px solid rgba(88, 24, 39, 0.3)',
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
                  ? 'var(--primary-gradient)' 
                  : 'var(--sage-light)',
                border: currentView === 'admin'
                  ? '1px solid var(--primary)'
                  : '1px solid var(--sage)',
                color: currentView === 'admin' ? '#FFFFFF' : 'var(--sage-dark)',
                borderRadius: '8px',
                padding: '0.45rem 0.95rem',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: currentView === 'admin' ? '0 2px 8px var(--primary-glow)' : 'none'
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
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              background: 'var(--sage-light)',
              border: '1px solid var(--sage)',
              color: 'var(--sage-dark)',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              <span style={{ color: 'var(--sage-medium)' }}>●</span>
              <span>Free Public Access</span>
            </div>

            {/* Discreet Admin Login Trigger */}
            <button
              type="button"
              onClick={onOpenAdminLogin}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-muted)',
                borderRadius: '8px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
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
