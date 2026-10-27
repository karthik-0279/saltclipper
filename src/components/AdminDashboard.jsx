import React, { useState, useEffect } from 'react';
import { fetchAdminOverview, sendTestAdminAlert } from '../services/api';

/**
 * AdminDashboard Component
 * Provides comprehensive administration, session oversight,
 * role-based permission monitoring, and email alert dispatcher testing.
 */
export default function AdminDashboard({ onBackToStudio, onShowToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

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
    const interval = setInterval(loadOverview, 10000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="admin-dashboard-container" style={{ animation: 'fadeIn 0.3s ease-out', marginTop: '1.5rem' }}>
      {/* Top Navigation Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛡️</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Administrator Security & Access Control
            </h2>
            <span style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
              RBAC ACTIVE
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Live session oversight, audit trail of user logins, and automated email alert management.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔄</span>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
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
              cursor: isSendingTest ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(239,68,68,0.3)'
            }}
          >
            <span>🔔</span>
            <span>{isSendingTest ? 'Sending Alert...' : 'Send Test Alert Email'}</span>
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
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🎬</span>
            <span>Back to Studio View</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '1rem', color: '#fca5a5', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ⚠️ Error loading admin stats: {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Metric 1 */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Admin Role
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            Administrator
          </div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
            Full Modification & Upload Privileges
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Sessions
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            {data ? data.activeSessionsCount : '—'} Connected
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Sessions protected via HTTP-Only token
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Email Notification Status
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            {data?.smtpConfigured ? '🟢 SMTP Active' : '🟡 Dev Mode / Console & Preview'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={data?.adminAlertEmail}>
            Target: <strong>{data?.adminAlertEmail || 'admin@autoclip.ai'}</strong>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Regular User Permission
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            View-Only Access
          </div>
          <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>
            Settings & Renders Restricted
          </div>
        </div>

        {/* Metric 5: Quota & Circuit Breaker Guard */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${data?.youtubeQuota?.isCircuitBreakerOpen ? '#ef4444' : '#38bdf8'}` }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            YouTube API Quota Guard
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: data?.youtubeQuota?.isCircuitBreakerOpen ? '#f87171' : '#f8fafc', margin: '0.35rem 0' }}>
            {data?.youtubeQuota ? `${data.youtubeQuota.remainingUploads}/${data.youtubeQuota.dailyLimit} Remaining` : '85/85 Safe Cap'}
          </div>
          <div style={{ fontSize: '0.78rem', color: data?.youtubeQuota?.isCircuitBreakerOpen ? '#ef4444' : '#34d399', fontWeight: 600 }}>
            {data?.youtubeQuota?.isCircuitBreakerOpen ? '🛑 Circuit Breaker Tripped' : `⚡ Safe Cap (${data?.youtubeQuota?.uploadsToday || 0} uploads today)`}
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column: Recent Login Events Audit Trail */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              🔔 Login Notifications Audit Log ({data?.recentLogins?.length || 0} Events)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Auto-dispatches email on each login
            </span>
          </div>

          {!data || data.recentLogins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              No login notifications logged yet. Sign in or click "Send Test Alert Email" to generate an event.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '0.5rem 0.6rem' }}>User Email</th>
                    <th style={{ padding: '0.5rem 0.6rem' }}>Role</th>
                    <th style={{ padding: '0.5rem 0.6rem' }}>Method</th>
                    <th style={{ padding: '0.5rem 0.6rem' }}>IP Address</th>
                    <th style={{ padding: '0.5rem 0.6rem' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLogins.map((evt) => (
                    <tr key={evt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.65rem 0.6rem', fontWeight: 700, color: '#f8fafc' }}>
                        {evt.userEmail}
                      </td>
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: evt.role === 'admin' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)',
                          color: evt.role === 'admin' ? '#f87171' : '#818cf8',
                          border: evt.role === 'admin' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(99,102,241,0.4)'
                        }}>
                          {evt.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.6rem', color: '#cbd5e1' }}>
                        {evt.method}
                      </td>
                      <td style={{ padding: '0.65rem 0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        {evt.ipAddress}
                      </td>
                      <td style={{ padding: '0.65rem 0.6rem', color: 'var(--text-muted)' }}>
                        {evt.readableTime || evt.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Active Sessions & Policy Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Active Sessions List */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              👥 Active Connected Sessions
            </h3>
            
            {!data || data.sessions.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No active sessions recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {data.sessions.map((sess, idx) => (
                  <div key={idx} style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>{sess.name}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: sess.role === 'admin' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                        color: sess.role === 'admin' ? '#f87171' : '#34d399'
                      }}>
                        {sess.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {sess.email} &bull; Started: {new Date(sess.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role-Based Permissions Reference */}
          <div className="card" style={{ background: 'rgba(15,23,42,0.9)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem', color: '#c084fc' }}>
              🛡️ Role-Based Permission Rules
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
              <li><strong>Admin User (Full Control):</strong> Can modify YouTube OAuth configuration, trigger renders, start batch uploads, and access this security dashboard.</li>
              <li><strong>Regular User (View-Only Mode):</strong> Can view and preview generated highlights in the phone player, but cannot change settings, disconnect channels, or execute expensive render jobs.</li>
              <li><strong>Email Dispatch:</strong> Automatically triggers an alert to <code>{data?.adminAlertEmail || 'ADMIN_ALERT_EMAIL'}</code> whenever anyone signs in.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
