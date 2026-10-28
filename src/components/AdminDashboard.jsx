import React, { useState, useEffect } from 'react';
import { fetchAdminOverview, sendTestAdminAlert, resetYouTubeQuota } from '../services/api';
import { LOGIN_HISTORY_STORAGE_KEY } from './AdminLoginModal';

/**
 * AdminDashboard Component
 * Strictly protected management dashboard providing:
 * - Login History tracking (timestamps, status: success/failed, device/user info)
 * - App management controls (quota management, email alerts, system controls)
 * - Strict access guard (zero access for regular users)
 */
export default function AdminDashboard({ isAdmin, onBackToStudio, onShowToast }) {
  const [data, setData] = useState(null);
  const [localHistory, setLocalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isResettingQuota, setIsResettingQuota] = useState(false);

  // Security Gate: Regular users must have zero access
  if (!isAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '520px', margin: '3rem auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#ef4444', marginBottom: '0.5rem', fontWeight: 800 }}>
          Administrator Access Required
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
          This management panel is strictly restricted. Regular users have zero access to this area. Please authenticate as an administrator to proceed.
        </p>
        <button
          type="button"
          onClick={onBackToStudio}
          style={{
            marginTop: '1.5rem',
            background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
            color: '#fff',
            border: 'none',
            padding: '0.7rem 1.5rem',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Return to Studio View
        </button>
      </div>
    );
  }

  // Load persistent local history
  const loadLocalHistory = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(LOGIN_HISTORY_STORAGE_KEY) || '[]');
      setLocalHistory(stored);
    } catch (e) {
      setLocalHistory([]);
    }
  };

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminOverview();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadLocalHistory();
    const interval = setInterval(loadOverview, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the local login history?')) {
      localStorage.removeItem(LOGIN_HISTORY_STORAGE_KEY);
      setLocalHistory([]);
      onShowToast('Login history audit log cleared.');
    }
  };

  const handleResetQuota = async () => {
    try {
      setIsResettingQuota(true);
      await resetYouTubeQuota(85);
      onShowToast('YouTube daily quota counter reset to safe cap (85)!');
      loadOverview();
    } catch (err) {
      onShowToast(`Failed to reset quota: ${err.message}`);
    } finally {
      setIsResettingQuota(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setIsSendingTest(true);
      const res = await sendTestAdminAlert();
      onShowToast(res.message || 'Test alert email dispatched!');
      loadOverview();
    } catch (err) {
      onShowToast(`Failed to send test alert: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Combine local audit history with server-side audit events
  const combinedLogins = [...localHistory];
  if (data?.recentLogins) {
    data.recentLogins.forEach(serverEvt => {
      if (!combinedLogins.some(l => l.id === serverEvt.id || (l.timestamp === serverEvt.timestamp && l.email === serverEvt.userEmail))) {
        combinedLogins.push({
          id: serverEvt.id,
          timestamp: serverEvt.timestamp,
          readableTime: serverEvt.readableTime || new Date(serverEvt.timestamp).toLocaleString(),
          email: serverEvt.userEmail,
          role: serverEvt.role,
          status: 'SUCCESS',
          device: serverEvt.userAgent ? serverEvt.userAgent.substring(0, 45) : 'Web Client',
          ip: serverEvt.ipAddress || '127.0.0.1'
        });
      }
    });
  }

  // Sort descending by timestamp
  combinedLogins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="admin-dashboard-container" style={{ animation: 'fadeIn 0.3s ease-out', marginTop: '1.5rem' }}>
      {/* Top Navigation Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛡️</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Administrator Management & Security
            </h2>
            <span style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
              ADMIN UNLOCKED
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Live login audit log, session oversight, YouTube quota management, and security alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={loadOverview}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--card-border)',
              color: '#cbd5e1',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            🔄 {loading ? 'Refreshing...' : 'Refresh'}
          </button>

          <button 
            type="button" 
            onClick={handleSendTestNotification}
            disabled={isSendingTest}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none',
              color: '#ffffff',
              padding: '0.5rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: isSendingTest ? 'not-allowed' : 'pointer'
            }}
          >
            🔔 {isSendingTest ? 'Sending...' : 'Send Test Alert'}
          </button>

          <button 
            type="button" 
            onClick={onBackToStudio}
            style={{
              background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
              border: 'none',
              color: '#ffffff',
              padding: '0.5rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            🎬 Back to Studio
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '1rem', color: '#fca5a5', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ⚠️ Backend sync notice: {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Admin Access Level
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            Full Root Access
          </div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
            Upload, Config & Audit Unlocked
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Login Events Tracked
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            {combinedLogins.length} Recorded
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Persistent Audit Trail
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Security Email Alerts
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            {data?.smtpConfigured ? '🟢 Active' : '🟡 Dev / Console Mode'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            To: {data?.adminAlertEmail || 'karthikgoud0279@gmail.com'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${data?.youtubeQuota?.isCircuitBreakerOpen ? '#ef4444' : '#10b981'}` }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            YouTube Daily Quota
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            {data?.youtubeQuota ? `${data.youtubeQuota.uploadsToday}/${data.youtubeQuota.dailyLimit}` : '0/85 Safe Cap'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
              {data?.youtubeQuota?.remainingUploads || 85} remaining
            </span>
            <button
              type="button"
              onClick={handleResetQuota}
              disabled={isResettingQuota}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--card-border)',
                color: '#38bdf8',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Login History Audit Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              📋 Login History & Access Audit Trail ({combinedLogins.length} Events)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Detailed log of user & admin authentication attempts, timestamps, status, and devices.
            </p>
          </div>
          {combinedLogins.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🗑️ Clear History
            </button>
          )}
        </div>

        {combinedLogins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            No login attempts recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Timestamp</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>User / Email</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Role</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Device & Client Info</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {combinedLogins.map((entry) => {
                  const isSuccess = entry.status === 'SUCCESS';
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.7rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {entry.readableTime}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          background: isSuccess ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                          color: isSuccess ? '#34d399' : '#f87171',
                          border: isSuccess ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)'
                        }}>
                          {isSuccess ? '● SUCCESS' : '✕ FAILED'}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', fontWeight: 700, color: '#f8fafc' }}>
                        {entry.email}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: entry.role === 'admin' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)',
                          color: entry.role === 'admin' ? '#f87171' : '#818cf8'
                        }}>
                          {(entry.role || 'user').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                        {entry.device}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', fontFamily: 'monospace', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {entry.ip}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* App Management Controls */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem', color: '#c084fc' }}>
          ⚙️ App Management & Security Configuration
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>Public Guest Mode</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Active. Unauthenticated visitors can create clips, slice videos, and download MP4s freely without login gates.
            </p>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#a78bfa' }}>YouTube Circuit Breaker</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Caps automated uploads at 85/day to safely protect Google Cloud quotas and token limits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
