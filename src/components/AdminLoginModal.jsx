import React, { useState } from 'react';
import { loginUser } from '../services/api';

/**
 * Storage key for persistent audit log of login events
 */
export const LOGIN_HISTORY_STORAGE_KEY = 'autoclip_login_history';

/**
 * Helper to record login history in localStorage
 */
export function recordLoginEvent({ email, role = 'admin', status = 'SUCCESS', reason = '' }) {
  try {
    const history = JSON.parse(localStorage.getItem(LOGIN_HISTORY_STORAGE_KEY) || '[]');
    const newRecord = {
      id: `login_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      readableTime: new Date().toLocaleString(),
      email: email || 'Unknown',
      role,
      status, // 'SUCCESS' | 'FAILED'
      reason,
      device: `${navigator.platform || 'Desktop'} - ${navigator.userAgent.split(' ')[0]} (Browser)`,
      ip: '127.0.0.1'
    };
    const updated = [newRecord, ...history].slice(0, 50); // Keep latest 50 entries
    localStorage.setItem(LOGIN_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to record login event:', e);
    return [];
  }
}

/**
 * AdminLoginModal Component
 * Discreet administrator portal for unlocking the protected Admin Dashboard.
 * Styled with Muted Sage Gray, Warm Cream Beige, and Deep Burgundy.
 */
export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both admin email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await loginUser(email.trim(), password);
      
      if (data?.user?.role !== 'admin') {
        recordLoginEvent({
          email: email.trim(),
          role: 'user',
          status: 'FAILED',
          reason: 'Access denied: user does not have Administrator privileges'
        });
        setError('Access denied: You do not have administrator permissions.');
        setLoading(false);
        return;
      }

      // Record successful login in audit log
      recordLoginEvent({
        email: email.trim(),
        role: 'admin',
        status: 'SUCCESS',
        reason: 'Authorized Admin Access'
      });

      // Save token in localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      onLoginSuccess(data.token, data.user);
      onClose();
    } catch (err) {
      recordLoginEvent({
        email: email.trim(),
        role: 'admin',
        status: 'FAILED',
        reason: err.message || 'Invalid credentials'
      });
      setError(err.message || 'Invalid administrator login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--card-bg)',
          border: '1.5px solid var(--sage)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(88, 24, 39, 0.25)',
          padding: '2.25rem',
          position: 'relative',
          animation: 'scaleUp 0.2s ease-out'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '4px'
          }}
          title="Close modal"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            fontSize: '2rem', 
            background: 'var(--primary-gradient)', 
            width: '64px', 
            height: '64px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderRadius: '16px', 
            margin: '0 auto 0.85rem auto',
            boxShadow: '0 4px 15px var(--primary-glow)',
            color: '#FFFFFF'
          }}>
            🛡️
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
            Administrator Portal
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
            Enter administrator credentials to unlock the management dashboard.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(88, 24, 39, 0.08)',
            border: '1px solid rgba(88, 24, 39, 0.3)',
            color: 'var(--primary)',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '1rem',
            fontWeight: 700
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.4rem' }}>
              Admin Email ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                backgroundColor: 'var(--bg-warm)',
                border: '1.5px solid var(--card-border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.4rem' }}>
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                backgroundColor: 'var(--bg-warm)',
                border: '1.5px solid var(--card-border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8rem',
              backgroundColor: 'var(--primary)',
              backgroundImage: 'var(--primary-gradient)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
              boxShadow: '0 4px 15px var(--primary-glow)'
            }}
          >
            {loading ? 'Authenticating...' : 'Unlock Admin Dashboard'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Return to Studio
          </button>
        </div>
      </div>
    </div>
  );
}
