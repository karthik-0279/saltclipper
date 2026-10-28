import React, { useState } from 'react';

/**
 * ConfigModal Component
 * Allows pasting Google OAuth Client ID & Client Secret directly from the UI.
 * Styled with Muted Sage Gray, Warm Cream Beige, and Deep Burgundy.
 */
export default function ConfigModal({ isOpen, onClose, onSave }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Please enter both Client ID and Client Secret');
      return;
    }
    setError('');
    onSave(clientId.trim(), clientSecret.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>
            ⚙️ Google OAuth 2.0 Credentials
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(88, 24, 39, 0.08)', border: '1px solid rgba(88, 24, 39, 0.3)', color: 'var(--primary)', padding: '0.65rem 0.95rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem', fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
              GOOGLE CLIENT ID
            </label>
            <input 
              type="text" 
              className="url-input" 
              style={{ width: '100%', background: 'var(--bg-warm)', border: '1.5px solid var(--card-border)', borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'var(--text)' }}
              placeholder="xxxx.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
              GOOGLE CLIENT SECRET
            </label>
            <input 
              type="password" 
              className="url-input" 
              style={{ width: '100%', background: 'var(--bg-warm)', border: '1.5px solid var(--card-border)', borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'var(--text)' }}
              placeholder="GOCSPX-xxxx"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--card-border)', color: 'var(--text-muted)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn-yt-connect"
            >
              💾 Save Credentials
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
