import React from 'react';

/**
 * Header Component
 * Minimalist Black & White layout.
 * Brand logo, multi-account rotation status badge,
 * and direct links to inline sections (YouTube Accounts & Instagram).
 * 100% Free & Open: No admin login walls or popup modals.
 */
export default function Header({ 
  onOpenAccountsManager,
  onOpenInstagram,
  accountsCount = 5,
  totalCapacity = 425
}) {
  const scrollToAccounts = () => {
    if (onOpenAccountsManager) onOpenAccountsManager();
    const el = document.getElementById('accounts-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToInstagram = () => {
    if (onOpenInstagram) onOpenInstagram();
    const el = document.getElementById('instagram-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header>
      <div className="logo">
        <div className="logo-icon">⚡</div>
        <span>SALT CLIPPER</span>
        <span className="logo-tag">Multi-Account Viral Reach Engine</span>
      </div>

      <div className="nav-status" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {/* Free Public Engine Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0.35rem 0.85rem',
          borderRadius: '20px',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--card-border)',
          color: '#FFFFFF',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          <span style={{ color: '#FFFFFF' }}>●</span>
          <span>Studio Active</span>
        </div>

        {/* Instagram Reels Hook Trigger */}
        <button
          type="button"
          onClick={scrollToInstagram}
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--card-border)',
            color: 'var(--text-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.45rem 0.85rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          title="Jump to Instagram Reels Sync Configuration"
        >
          <span>📸</span>
          <span>Instagram Hook</span>
        </button>

        {/* Multi-Account Manager Trigger */}
        <button
          type="button"
          onClick={scrollToAccounts}
          style={{
            background: '#FFFFFF',
            border: 'none',
            color: '#000000',
            borderRadius: 'var(--radius-sm)',
            padding: '0.45rem 1rem',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          title="Jump to YouTube Multi-Account Manager"
        >
          <span>👥</span>
          <span>YouTube Accounts ({accountsCount})</span>
        </button>
      </div>
    </header>
  );
}
