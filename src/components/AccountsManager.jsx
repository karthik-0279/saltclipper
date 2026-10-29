import React, { useState, useEffect } from 'react';
import {
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
} from '../services/profileManager';

/**
 * YouTube Accounts Manager Component
 * 
 * Production Requirements:
 * 1. 100% Free & Open: No admin login or restriction walls.
 * 2. Visual Multi-Account Pool overview (5+ accounts initially, scalable to 20+).
 * 3. Link new accounts via Google Cloud Console OAuth (opens smooth popup).
 * 4. Add/remove accounts dynamically with instant browser localStorage persistence.
 * 5. Manual & automated profile switching with live quota gauges.
 * 6. Audit rotation logs showing intelligent zero-limit-waste failovers.
 */
export default function AccountsManager({ isOpen, onClose, onShowToast }) {
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'link' | 'logs'
  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [rotationLogs, setRotationLogs] = useState([]);

  // Link New Account Form State
  const [channelName, setChannelName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [dailyLimit, setDailyLimit] = useState(85);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const refreshState = () => {
    const profs = getYoutubeProfiles();
    const st = getMultiAccountStats();
    const logs = getRotationLogs();
    setProfiles(profs);
    setStats(st);
    setRotationLogs(logs);
  };

  useEffect(() => {
    if (isOpen) {
      refreshState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Switch Active Profile
  const handleSelectActive = (profileId) => {
    setActiveProfile(profileId);
    refreshState();
    if (onShowToast) onShowToast('Switched active YouTube Shorts account.');
  };

  // 2. Remove Profile
  const handleDelete = (profileId, accountHandle) => {
    try {
      deleteProfile(profileId);
      refreshState();
      if (onShowToast) onShowToast(`Removed ${accountHandle} from rotation pool.`);
    } catch (err) {
      if (onShowToast) onShowToast(`⚠️ ${err.message}`);
    }
  };

  // 3. Reset Single or All Quotas
  const handleResetOne = (profileId) => {
    resetProfileQuota(profileId);
    refreshState();
    if (onShowToast) onShowToast('Reset daily quota for account.');
  };

  const handleResetAll = () => {
    resetAllProfilesQuota();
    refreshState();
    if (onShowToast) onShowToast('All multi-account daily quota counters reset to 0!');
  };

  // 4. Test 403 Smart Rotation Failover (Demonstrates Zero Limit Waste)
  const handleTestFailover = () => {
    const res = rotateToNextProfile('Simulated 403 Quota Exceeded test — Zero Limit Waste Triggered');
    refreshState();
    if (onShowToast) {
      onShowToast(res.message);
    }
  };

  // 5. Link Account via Google Cloud Console OAuth Popup
  const handleLaunchGoogleOAuth = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      '/api/auth/google',
      'google_youtube_oauth',
      `width=${width},height=${height},top=${top},left=${left},status=no,toolbar=no,menubar=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Fallback if popup blocker is active
      window.location.href = '/api/auth/google';
    } else {
      if (onShowToast) onShowToast('Opening Google Cloud OAuth window...');
    }
  };

  // 6. Submit Add Account Form
  const handleAddAccountSubmit = (e) => {
    e.preventDefault();
    if (!channelName.trim()) {
      if (onShowToast) onShowToast('Please provide a channel or account name.');
      return;
    }

    const newProf = addNewProfile({
      name: channelName,
      handle: handle || `@Channel_${profiles.length + 1}`,
      email: email || `creator_${profiles.length + 1}@youtube.com`,
      dailyLimit: Number(dailyLimit) || 85,
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim()
    });

    refreshState();
    setActiveTab('accounts');
    setChannelName('');
    setHandle('');
    setEmail('');
    setClientId('');
    setClientSecret('');
    if (onShowToast) onShowToast(`🎉 Added ${newProf.handle} to Multi-Account Rotation Pool!`);
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 9999 }}
    >
      <div 
        className="card"
        style={{
          width: '95%',
          maxWidth: '840px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#020B2E',
          border: '1.5px solid rgba(37, 93, 206, 0.4)',
          borderRadius: '20px',
          boxShadow: '0 25px 70px rgba(2, 24, 97, 0.9), 0 0 40px rgba(37, 93, 206, 0.25)',
          padding: '2rem',
          position: 'relative',
          color: '#F0F4FF'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '1.4rem',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
          title="Close"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '2rem',
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #DE1110 0%, #255DCE 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(37, 93, 206, 0.4)'
          }}>
            🎬
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }}>
              SALT CLIPPER &bull; YouTube Accounts Manager
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#8DA4D0' }}>
              Intelligent Quota Controller &bull; Automatic 403 Failover &bull; 20+ Clip Continuous Queue
            </p>
          </div>
        </div>

        {/* Multi-Account Capacity Banner */}
        {stats && (
          <div style={{
            background: 'rgba(2, 24, 97, 0.6)',
            border: '1px solid rgba(37, 93, 206, 0.35)',
            borderRadius: '14px',
            padding: '1.2rem',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#8DA4D0', fontWeight: 700 }}>
                Connected Accounts
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                {stats.totalProfiles}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#8DA4D0', fontWeight: 700 }}>
                Total Pool Daily Cap
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#82aaff', marginTop: '2px' }}>
                {stats.totalCapacity} <span style={{ fontSize: '0.85rem' }}>Shorts/day</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#8DA4D0', fontWeight: 700 }}>
                Uploaded Today
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.totalUsedToday > 0 ? '#ff5e5d' : '#FFFFFF', marginTop: '2px' }}>
                {stats.totalUsedToday}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#8DA4D0', fontWeight: 700 }}>
                Remaining Quota
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                {stats.totalRemaining}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(37, 93, 206, 0.25)', paddingBottom: '10px', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            style={{
              background: activeTab === 'accounts' ? '#255DCE' : 'rgba(2, 24, 97, 0.5)',
              border: '1px solid rgba(37, 93, 206, 0.3)',
              color: '#FFFFFF',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            👥 Connected Accounts ({profiles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            style={{
              background: activeTab === 'link' ? '#DE1110' : 'rgba(2, 24, 97, 0.5)',
              border: '1px solid rgba(37, 93, 206, 0.3)',
              color: '#FFFFFF',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ➕ Link New Account
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            style={{
              background: activeTab === 'logs' ? '#255DCE' : 'rgba(2, 24, 97, 0.5)',
              border: '1px solid rgba(37, 93, 206, 0.3)',
              color: '#FFFFFF',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            🔄 Rotation Failover Logs ({rotationLogs.length})
          </button>
        </div>

        {/* TAB 1: CONNECTED ACCOUNTS LIST */}
        {activeTab === 'accounts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#8DA4D0' }}>
                Intelligent rotation seamlessly switches when an account hits 85 uploads or a 403 error.
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleTestFailover}
                  style={{
                    background: 'rgba(222, 17, 16, 0.2)',
                    border: '1px solid #DE1110',
                    color: '#ff5e5d',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Simulate 403 Quota Exceeded error to verify instant zero-waste failover"
                >
                  ⚡ Test 403 Failover
                </button>
                <button
                  type="button"
                  onClick={handleResetAll}
                  style={{
                    background: 'rgba(37, 93, 206, 0.2)',
                    border: '1px solid #255DCE',
                    color: '#82aaff',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🔄 Reset All Quotas
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {profiles.map((prof, index) => {
                const isActive = prof.status === 'ACTIVE';
                const isExhausted = prof.status === 'EXHAUSTED' || (prof.usedToday >= prof.dailyLimit);
                const percent = Math.min(100, Math.round(((prof.usedToday || 0) / (prof.dailyLimit || 85)) * 100));

                return (
                  <div 
                    key={prof.id}
                    style={{
                      background: isActive 
                        ? 'rgba(4, 30, 117, 0.85)' 
                        : 'rgba(2, 24, 97, 0.4)',
                      border: `1.5px solid ${isActive ? '#255DCE' : 'rgba(37, 93, 206, 0.25)'}`,
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      boxShadow: isActive ? '0 0 20px rgba(37, 93, 206, 0.25)' : 'none'
                    }}
                  >
                    {/* Account Identity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: isActive ? '#255DCE' : '#041E75',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: '#FFFFFF'
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#FFFFFF' }}>
                            {prof.name}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: isActive 
                              ? 'rgba(52, 211, 153, 0.2)' 
                              : (isExhausted ? 'rgba(222, 17, 16, 0.2)' : 'rgba(141, 164, 208, 0.15)'),
                            color: isActive 
                              ? '#34d399' 
                              : (isExhausted ? '#ff5e5d' : '#8DA4D0'),
                            border: `1px solid ${isActive ? '#34d399' : (isExhausted ? '#DE1110' : 'rgba(141, 164, 208, 0.3)')}`
                          }}>
                            {isActive ? '● ACTIVE WORKER' : (isExhausted ? '🛑 QUOTA EXHAUSTED' : 'STANDBY')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#8DA4D0', marginTop: '2px' }}>
                          <span style={{ color: '#82aaff', fontWeight: 600 }}>{prof.handle}</span> &bull; {prof.email}
                        </div>
                      </div>
                    </div>

                    {/* Quota Progress Bar */}
                    <div style={{ minWidth: '180px', flex: 1, maxWidth: '240px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: '#8DA4D0' }}>
                        <span>Quota Used</span>
                        <strong style={{ color: isExhausted ? '#ff5e5d' : '#FFFFFF' }}>
                          {prof.usedToday || 0} / {prof.dailyLimit || 85}
                        </strong>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: isExhausted ? '#DE1110' : 'linear-gradient(90deg, #255DCE, #34d399)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleSelectActive(prof.id)}
                          style={{
                            background: '#255DCE',
                            border: 'none',
                            color: '#FFFFFF',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          Make Active
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleResetOne(prof.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(141, 164, 208, 0.3)',
                          color: '#8DA4D0',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                        title="Reset daily usage counter"
                      >
                        Reset
                      </button>
                      {profiles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(prof.id, prof.handle)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(222, 17, 16, 0.4)',
                            color: '#ff5e5d',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                          title="Remove from rotation pool"
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

        {/* TAB 2: LINK NEW ACCOUNT VIA GOOGLE OAUTH */}
        {activeTab === 'link' && (
          <div>
            {/* Quick Link via Google OAuth Button */}
            <div style={{
              background: 'rgba(4, 30, 117, 0.7)',
              border: '1.5px solid #255DCE',
              borderRadius: '14px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#FFFFFF' }}>
                🔗 Connect via Google Cloud Console OAuth
              </h3>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.86rem', color: '#8DA4D0', maxWidth: '520px', marginInline: 'auto' }}>
                Launch the secure Google Consent Screen to authorize your YouTube channel for automatic Shorts uploads.
              </p>
              <button
                type="button"
                onClick={handleLaunchGoogleOAuth}
                style={{
                  background: 'linear-gradient(135deg, #DE1110 0%, #ff3b30 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '0.75rem 1.65rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(222, 17, 16, 0.4)'
                }}
              >
                🚀 Connect YouTube Channel (OAuth 2.0 Popup)
              </button>
            </div>

            {/* Manual Account Registration Form */}
            <form onSubmit={handleAddAccountSubmit} style={{ background: 'rgba(2, 24, 97, 0.4)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(37, 93, 206, 0.25)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', color: '#FFFFFF' }}>
                Or Add Custom Profile Manually:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#8DA4D0', marginBottom: '4px' }}>
                    Channel Name *
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="e.g. Viral Shorts Network"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      background: '#041E75',
                      border: '1px solid rgba(37, 93, 206, 0.3)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#8DA4D0', marginBottom: '4px' }}>
                    Channel Handle (@)
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@ViralShortsOfficial"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      background: '#041E75',
                      border: '1px solid rgba(37, 93, 206, 0.3)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#8DA4D0', marginBottom: '4px' }}>
                    Channel Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@youtube.com"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      background: '#041E75',
                      border: '1px solid rgba(37, 93, 206, 0.3)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#8DA4D0', marginBottom: '4px' }}>
                    Daily Quota Limit (Default: 85)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      background: '#041E75',
                      border: '1px solid rgba(37, 93, 206, 0.3)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  background: '#255DCE',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                ➕ Add Account to Pool
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: ROTATION & FAILOVER AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#8DA4D0' }}>
                Real-time record of intelligent account failovers during upload runs.
              </span>
              <button
                type="button"
                onClick={() => { clearRotationLogs(); refreshState(); }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(141, 164, 208, 0.3)',
                  color: '#8DA4D0',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Clear Logs
              </button>
            </div>

            {rotationLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#8DA4D0', fontSize: '0.9rem' }}>
                No rotation events recorded yet. Quota failovers will appear here automatically.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {rotationLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: 'rgba(2, 24, 97, 0.5)',
                      border: '1px solid rgba(37, 93, 206, 0.25)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>
                        🔄 {log.fromProfile} ➔ {log.toProfile}
                      </span>
                      <span style={{ color: '#8DA4D0', fontSize: '0.75rem' }}>
                        {log.readableTime}
                      </span>
                    </div>
                    <div style={{ color: '#F0F4FF' }}>
                      <strong>Reason:</strong> {log.reason}
                    </div>
                    {log.clipTitle && (
                      <div style={{ color: '#8DA4D0', fontSize: '0.78rem', marginTop: '2px' }}>
                        Clip: {log.clipTitle}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ textAlign: 'right', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(37, 93, 206, 0.25)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#041E75',
              border: '1px solid rgba(37, 93, 206, 0.4)',
              color: '#FFFFFF',
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
