import React, { useState, useEffect } from 'react';
import {
  fetchAdminOverview,
  sendTestAdminAlert,
  resetYouTubeQuota,
  getYoutubeProfiles,
  getActiveProfile,
  setActiveProfile,
  addNewProfile,
  deleteProfile,
  resetProfileQuota,
  resetAllProfilesQuota,
  getRotationLogs,
  clearRotationLogs,
  rotateToNextProfile,
  getMultiAccountStats
} from '../services/api';
import { LOGIN_HISTORY_STORAGE_KEY } from './AdminLoginModal';

/**
 * AdminDashboard Component
 * Strictly protected administrator management portal:
 * 1. Multi-Account YouTube Profile Manager (Scalable system for unlimited accounts)
 * 2. Intelligent Account Rotation & Queue Controller
 * 3. Client-Side Login History & Audit Trail
 * 4. App Management Controls & Security Overview
 */
export default function AdminDashboard({ isAdmin, onBackToStudio, onShowToast }) {
  const [activeTab, setActiveTab] = useState('profiles'); // 'profiles' | 'logins' | 'rotations' | 'system'
  const [data, setData] = useState(null);
  const [localHistory, setLocalHistory] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [rotationLogs, setRotationLogs] = useState([]);
  const [multiStats, setMultiStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isResettingQuota, setIsResettingQuota] = useState(false);

  // Add Account Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLimit, setNewLimit] = useState(85);
  const [newClientId, setNewClientId] = useState('');
  const [newClientSecret, setNewClientSecret] = useState('');

  // Security Guard: Regular users have zero access
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

  // Reload all dashboard state from client storage
  const refreshAll = () => {
    try {
      setLoading(true);
      setError(null);
      const profs = getYoutubeProfiles();
      const stats = getMultiAccountStats();
      const rots = getRotationLogs();
      const storedHistory = JSON.parse(localStorage.getItem(LOGIN_HISTORY_STORAGE_KEY) || '[]');
      
      setProfiles(profs);
      setMultiStats(stats);
      setRotationLogs(rots);
      setLocalHistory(storedHistory);

      fetchAdminOverview().then(res => {
        setData(res);
        setLoading(false);
      }).catch(err => {
        setError(err.message);
        setLoading(false);
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 12000);
    return () => clearInterval(interval);
  }, []);

  // Multi-Account Action Handlers
  const handleSetActiveAccount = (id) => {
    const updated = setActiveProfile(id);
    setProfiles(updated);
    setMultiStats(getMultiAccountStats());
    const target = updated.find(p => p.id === id);
    onShowToast(`Active YouTube upload account switched to ${target?.handle || 'Profile'}`);
  };

  const handleResetSingleAccount = (id) => {
    const updated = resetProfileQuota(id);
    setProfiles(updated);
    setMultiStats(getMultiAccountStats());
    onShowToast('Account daily quota counter reset to 0/85!');
  };

  const handleDeleteAccount = (id) => {
    try {
      const updated = deleteProfile(id);
      setProfiles(updated);
      setMultiStats(getMultiAccountStats());
      onShowToast('YouTube profile removed.');
    } catch (e) {
      onShowToast(`Cannot delete: ${e.message}`);
    }
  };

  const handleSimulateRotation = (id) => {
    // Fill up the profile to test auto-rotation
    const updated = profiles.map(p => {
      if (p.id === id) {
        return { ...p, usedToday: p.dailyLimit, status: 'EXHAUSTED' };
      }
      return p;
    });
    localStorage.setItem('autoclip_youtube_profiles', JSON.stringify(updated));
    const result = rotateToNextProfile('Manual Quota Limit Simulation - Testing Failover');
    refreshAll();
    if (result.rotated) {
      onShowToast(`⚡ Auto-Rotation Success! Switched to ${result.currentProfile.handle}`);
    } else {
      onShowToast(result.message);
    }
  };

  const handleAddNewAccount = (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) {
      onShowToast('Please enter a channel name.');
      return;
    }

    addNewProfile({
      name: newChannelName,
      handle: newHandle,
      email: newEmail,
      dailyLimit: Number(newLimit) || 85,
      clientId: newClientId,
      clientSecret: newClientSecret
    });

    setShowAddModal(false);
    setNewChannelName('');
    setNewHandle('');
    setNewEmail('');
    setNewLimit(85);
    setNewClientId('');
    setNewClientSecret('');
    refreshAll();
    onShowToast('🎉 New YouTube Profile added successfully!');
  };

  const handleResetAllQuotas = async () => {
    try {
      setIsResettingQuota(true);
      await resetYouTubeQuota();
      refreshAll();
      onShowToast('All multi-account YouTube quota counters reset to 0!');
    } catch (err) {
      onShowToast(`Failed to reset quotas: ${err.message}`);
    } finally {
      setIsResettingQuota(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the local login history?')) {
      localStorage.removeItem(LOGIN_HISTORY_STORAGE_KEY);
      setLocalHistory([]);
      onShowToast('Login history audit log cleared.');
    }
  };

  const handleClearRotationLogs = () => {
    clearRotationLogs();
    setRotationLogs([]);
    onShowToast('Rotation audit log cleared.');
  };

  const handleSendTestNotification = async () => {
    try {
      setIsSendingTest(true);
      const res = await sendTestAdminAlert();
      onShowToast(res.message || 'Test alert email dispatched!');
      refreshAll();
    } catch (err) {
      onShowToast(`Failed to send test alert: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Combine login audit entries
  const combinedLogins = [...localHistory];
  if (data?.recentLogins) {
    data.recentLogins.forEach(serverEvt => {
      if (!combinedLogins.some(l => l.id === serverEvt.id || (l.timestamp === serverEvt.timestamp && l.email === serverEvt.email))) {
        combinedLogins.push(serverEvt);
      }
    });
  }
  combinedLogins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="admin-dashboard-container" style={{ animation: 'fadeIn 0.3s ease-out', marginTop: '1.5rem' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🛡️</span>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Administrator Control Center
            </h2>
            <span style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
              ADMIN UNLOCKED
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Multi-Account YouTube Rotation Engine, Scalable Unlimited Upload Queue & Persistent Audit Trail.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={refreshAll}
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
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
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
            <span>➕</span> Add YouTube Account
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
          ⚠️ Notice: {error}
        </div>
      )}

      {/* Aggregate Multi-Account Pool Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Multi-Account Pool Capacity
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            {multiStats?.totalCapacity || 425} Clips / Day
          </div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
            {multiStats?.totalProfiles || 5} Profiles Configured ($N \times 85$ Cap)
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Active Rotation Runner
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8', margin: '0.35rem 0' }}>
            {multiStats?.activeProfile?.handle || '@AutoClipMain'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Used: {multiStats?.activeProfile?.usedToday || 0}/{multiStats?.activeProfile?.dailyLimit || 85} Today
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Pool Remaining Uploads
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            {multiStats?.totalRemaining || 425} Available
          </div>
          <div style={{ fontSize: '0.78rem', color: '#a78bfa' }}>
            Auto-rotates to standby upon limit
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Audit Trail Events
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0.35rem 0' }}>
            {combinedLogins.length} Logins / {rotationLogs.length} Rotations
          </div>
          <div style={{ fontSize: '0.78rem', color: '#fbbf24' }}>
            Persistent Local Audit Log
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--card-border)', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('profiles')}
          style={{
            background: activeTab === 'profiles' ? 'var(--primary)' : 'transparent',
            border: 'none',
            color: activeTab === 'profiles' ? '#ffffff' : '#94a3b8',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📺</span> YouTube Profiles Manager ({profiles.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rotations')}
          style={{
            background: activeTab === 'rotations' ? 'var(--primary)' : 'transparent',
            border: 'none',
            color: activeTab === 'rotations' ? '#ffffff' : '#94a3b8',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>⚡</span> Rotation Audit Log ({rotationLogs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logins')}
          style={{
            background: activeTab === 'logins' ? 'var(--primary)' : 'transparent',
            border: 'none',
            color: activeTab === 'logins' ? '#ffffff' : '#94a3b8',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📋</span> Login History ({combinedLogins.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          style={{
            background: activeTab === 'system' ? 'var(--primary)' : 'transparent',
            border: 'none',
            color: activeTab === 'system' ? '#ffffff' : '#94a3b8',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>⚙️</span> System Controls
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: YOUTUBE PROFILES MANAGER */}
      {/* ======================================================== */}
      {activeTab === 'profiles' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Multi-Account YouTube Profile Manager
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Unlimited accounts support. Upload pipeline automatically fails over from Account 1 → Account 2 → Account N when daily quota (85) or 403 occurs.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleResetAllQuotas}
                disabled={isResettingQuota}
                style={{
                  background: 'rgba(56,189,248,0.15)',
                  border: '1px solid rgba(56,189,248,0.3)',
                  color: '#38bdf8',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔄 Reset All Quotas (0/85)
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ➕ Add New Account
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {profiles.map((prof, index) => {
              const isActive = prof.status === 'ACTIVE';
              const isExhausted = prof.usedToday >= prof.dailyLimit;
              const percent = Math.min(100, Math.round((prof.usedToday / prof.dailyLimit) * 100));

              return (
                <div 
                  key={prof.id} 
                  className="card"
                  style={{
                    padding: '1.25rem',
                    border: isActive 
                      ? '2px solid #10b981' 
                      : (isExhausted ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--card-border)'),
                    position: 'relative',
                    background: isActive ? 'rgba(16,185,129,0.04)' : 'var(--card-bg)'
                  }}
                >
                  {/* Status Pill */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      background: isActive 
                        ? 'rgba(16,185,129,0.2)' 
                        : (isExhausted ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.15)'),
                      color: isActive ? '#34d399' : (isExhausted ? '#f87171' : '#94a3b8'),
                      border: isActive ? '1px solid #10b981' : 'none'
                    }}>
                      {isActive ? '🟢 ACTIVE RUNNER' : (isExhausted ? '🔴 QUOTA EXHAUSTED' : '⚪ STANDBY')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                      Profile #{index + 1}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                    {prof.name}
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {prof.handle}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                    {prof.email} • {prof.subscriberCount || '100K'} Subscribers
                  </div>

                  {/* Quota Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                      <span style={{ color: '#cbd5e1' }}>Daily Quota Usage:</span>
                      <strong style={{ color: isExhausted ? '#f87171' : '#34d399' }}>
                        {prof.usedToday} / {prof.dailyLimit} Uploads ({percent}%)
                      </strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${percent}%`, 
                          background: isExhausted ? '#ef4444' : (isActive ? '#10b981' : '#6366f1'),
                          transition: 'width 0.3s ease'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Profile Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => handleSetActiveAccount(prof.id)}
                        style={{
                          background: 'rgba(16,185,129,0.15)',
                          border: '1px solid rgba(16,185,129,0.4)',
                          color: '#34d399',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ Set Active
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleResetSingleAccount(prof.id)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--card-border)',
                        color: '#cbd5e1',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Reset Quota
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateRotation(prof.id)}
                      title="Simulates 403 / 85 limit to verify automatic failover to next profile"
                      style={{
                        background: 'rgba(245,158,11,0.12)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        color: '#fbbf24',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      🧪 Test Failover
                    </button>

                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(prof.id)}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#f87171',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginLeft: 'auto'
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ROTATION AUDIT LOG */}
      {/* ======================================================== */}
      {activeTab === 'rotations' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                ⚡ Intelligent Account Rotation Audit Log ({rotationLogs.length} Events)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Tracks automatic queue failovers between accounts when daily quota limits or 403 API errors are triggered.
              </p>
            </div>
            {rotationLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearRotationLogs}
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
                🗑️ Clear Rotation Log
              </button>
            )}
          </div>

          {rotationLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              No account rotation events recorded yet. All uploads are processing smoothly on active profiles!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Timestamp</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>From Profile</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>→</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Rotated To</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Trigger Reason</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Pipeline Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rotationLogs.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.7rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {entry.readableTime}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', fontWeight: 700, color: '#f87171' }}>
                        {entry.fromProfile}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', color: '#38bdf8', fontWeight: 800 }}>
                        →
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', fontWeight: 700, color: '#34d399' }}>
                        {entry.toProfile}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                        {entry.reason}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          background: 'rgba(16,185,129,0.2)',
                          color: '#34d399',
                          border: '1px solid rgba(16,185,129,0.4)'
                        }}>
                          ● UNINTERRUPTED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LOGIN HISTORY AUDIT TRAIL */}
      {/* ======================================================== */}
      {activeTab === 'logins' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                📋 Login History & Access Audit Trail ({combinedLogins.length} Events)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Detailed client-side log of user & admin authentication attempts, timestamps, status, and devices.
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
      )}

      {/* ======================================================== */}
      {/* TAB 4: SYSTEM CONTROLS & SECURITY */}
      {/* ======================================================== */}
      {activeTab === 'system' && (
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem', color: '#c084fc' }}>
            ⚙️ App Management & Security Configuration
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>Public Guest Mode</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Active. Unauthenticated visitors can create clips, slice videos, and download MP4s freely without login barriers.
              </p>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#a78bfa' }}>Multi-Account Circuit Breaker</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Intelligently balances upload traffic across all {profiles.length} connected YouTube accounts up to {multiStats?.totalCapacity || 425} uploads daily.
              </p>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#34d399' }}>Security Alert Testing</h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Dispatches an audit security alert event directly to the persistent browser log.
              </p>
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isSendingTest}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: isSendingTest ? 'not-allowed' : 'pointer'
                }}
              >
                🔔 {isSendingTest ? 'Sending...' : 'Dispatch Test Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW YOUTUBE ACCOUNT */}
      {/* ======================================================== */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem', animation: 'scaleUp 0.25s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>📺</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  Add New YouTube Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewAccount}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Channel Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Viral Shorts Network"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  YouTube @Handle *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. @ViralShortsNetwork"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Account Email
                </label>
                <input
                  type="email"
                  placeholder="creator@youtube.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Safe Daily Upload Cap (Default: 85)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Adds +{newLimit || 85} to total daily system capacity.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid var(--card-border)',
                    color: '#cbd5e1',
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
