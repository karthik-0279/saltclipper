import React from 'react';

/**
 * Header Component
 * Displays brand logo, model status, user identity badge, and secure logout action.
 */
export default function Header({ user, isAdmin, currentView, onToggleView, onLogout }) {
  const userInitial = (user?.name || user?.email || 'C').charAt(0).toUpperCase();

  return (
    <header>
      <div className="logo">
        <div className="logo-icon">⚡</div>
        <span>AutoClip AI</span>
        <span className="logo-tag">Unlimited Reach Engine</span>
      </div>

      <div className="nav-status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* User Profile Pill with Role Badge */}
        <div className="user-profile-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="user-avatar">{userInitial}</div>
          <span className="user-name">{user?.name || user?.email || 'Alex Creator'}</span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '0.15rem 0.5rem',
            borderRadius: '12px',
            background: isAdmin 
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.35))' 
              : 'rgba(100, 116, 139, 0.2)',
            color: isAdmin ? '#f87171' : '#94a3b8',
            border: isAdmin ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(100, 116, 139, 0.3)',
            textTransform: 'uppercase'
          }}>
            {isAdmin ? '👑 Admin' : '👤 Read-Only'}
          </span>
        </div>

        {/* Admin Console Switch Button (Only visible to Admin) */}
        {isAdmin && (
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
        )}

        {/* Secure Logout Trigger */}
        <button 
          id="btnLogout"
          className="btn-logout" 
          onClick={onLogout}
          title="Log out and invalidate session"
        >
          <span>🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    </header>
  );
}
