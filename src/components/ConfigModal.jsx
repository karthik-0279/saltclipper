import React, { useState } from 'react';

/**
 * ConfigModal Component
 * Allows pasting Google OAuth Client ID & Client Secret directly from the UI.
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
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>⚙️ Google OAuth 2.0 Credentials</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
              GOOGLE CLIENT ID
            </label>
            <input 
              type="text" 
              className="url-input" 
              style={{ width: '100%', background: '#0b0f19', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '0.6rem' }}
              placeholder="xxxx.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
              GOOGLE CLIENT SECRET
            </label>
            <input 
              type="password" 
              className="url-input" 
              style={{ width: '100%', background: '#0b0f19', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '0.6rem' }}
              placeholder="GOCSPX-xxxx"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
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
