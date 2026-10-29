import React from 'react';

/**
 * Header Component
 * Minimalist Black & White layout.
 * Brand logo, system status badge,
 * and direct scroll link to Google Cloud Projects Manager.
 * 100% Free & Open: No popups, no modals, expanded single-page architecture.
 */
export default function Header({ 
  onOpenProjectsManager,
  projectsCount = 5,
  totalCapacity = 425
}) {
  const scrollToProjects = () => {
    if (onOpenProjectsManager) onOpenProjectsManager();
    const el = document.getElementById('projects-section') || document.getElementById('accounts-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header>
      <div className="logo">
        <div className="logo-icon">⚡</div>
        <span>SALT CLIPPER</span>
        <span className="logo-tag">Multi-Project Viral Reach Engine</span>
      </div>

      <div className="nav-status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Studio Active Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0.4rem 0.85rem',
          borderRadius: '20px',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--card-border)',
          color: '#FFFFFF',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          <span style={{ color: '#FFFFFF' }}>●</span>
          <span>Instant Auto-Upload Active</span>
        </div>

        {/* 5 Google Cloud Projects Manager Jump Button */}
        <button
          type="button"
          onClick={scrollToProjects}
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
          title="Scroll down to Google Cloud Console 5-Projects Manager"
        >
          <span>☁</span>
          <span>Cloud Projects ({projectsCount})</span>
        </button>
      </div>
    </header>
  );
}
