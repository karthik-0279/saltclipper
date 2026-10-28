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
 * Discreet administrator portal for unlocking the protected Admin Dashboard
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#0f172a',
          border: '1.5px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          position: 'relative',
          animation: 'fadeIn 0.2s ease-out'
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
            color: '#94a3b8',
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
            background: 'rgba(99, 102, 241, 0.15)', 
            width: '60px', 
            height: '60px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderRadius: '16px', 
            margin: '0 auto 0.75rem auto',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            🛡️
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            Administrator Portal
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.35rem 0 0 0' }}>
            Enter administrator credentials to unlock the management dashboard.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '1rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
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
                padding: '0.65rem 0.85rem',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
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
                padding: '0.65rem 0.85rem',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
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
              padding: '0.75rem',
              backgroundColor: '#6366f1',
              backgroundImage: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
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
              color: '#64748b',
              fontSize: '0.8rem',
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
