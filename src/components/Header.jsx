import React from 'react';

/**
 * Header Component
 * Displays brand logo, multi-account rotation status badge,
 * and direct 1-click access to the YouTube Accounts Manager.
 * 100% Free & Open: No admin login walls or restrictions.
 */
export default function Header({ 
  onOpenAccountsManager,
  accountsCount = 5,
  totalCapacity = 425
}) {
  return (
    <header>
      <div className="logo">
        <div className="logo-icon">⚡</div>
        <span>AutoClip AI</span>
        <span className="logo-tag">Multi-Account Reach Engine</span>
      </div>

      <div className="nav-status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Free Public Engine Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0.35rem 0.85rem',
          borderRadius: '20px',
          background: 'rgba(37, 93, 206, 0.2)',
          border: '1px solid rgba(37, 93, 206, 0.4)',
          color: '#82aaff',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          <span style={{ color: '#34d399' }}>●</span>
          <span>Unlimited Studio Active</span>
        </div>

        {/* Multi-Account Manager Trigger */}
        <button
          type="button"
          onClick={onOpenAccountsManager}
          style={{
            background: 'linear-gradient(135deg, #DE1110 0%, #255DCE 100%)',
            border: 'none',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '0.45rem 1rem',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 15px rgba(37, 93, 206, 0.35)'
          }}
          title="Open YouTube Multi-Account Manager"
        >
          <span>👥</span>
          <span>YouTube Accounts ({accountsCount})</span>
        </button>
      </div>
    </header>
  );
}
