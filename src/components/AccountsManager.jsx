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
 * YouTube Accounts Manager Component (Single-Page Inline Section)
 * 
 * Minimalist Black & White Theme (No Popups / No Admin Walls):
 * - Visual Multi-Account Pool overview (5+ accounts initially, scalable to 20+).
 * - Google Cloud Console OAuth integration with localStorage persistence.
 * - Auto-Switch Quota Logic: If current account hits quota or 403 error,
 *   controller switches seamlessly to next account without wasting daily limits.
 */
export default function AccountsManager({ onShowToast }) {
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
    refreshState();
  }, []);

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
    <section id="accounts-section" className="card" style={{ marginTop: '2rem' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: '#FFFFFF',
            color: '#000000',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: 900
          }}>
            ▶
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Google Cloud Multi-Account YouTube Manager
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Intelligent Quota Controller &bull; Automatic 403 Failover &bull; Zero Limit Waste
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleTestFailover}
            style={{
              background: '#1A1A1A',
              border: '1px solid #333333',
              color: '#FFFFFF',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Simulate 403 Quota Exceeded error to verify instant zero-waste failover"
          >
            ⚡ Test 403 Auto-Switch
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            style={{
              background: '#1A1A1A',
              border: '1px solid #333333',
              color: 'var(--text-muted)',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🔄 Reset All Quotas
          </button>
        </div>
      </div>

      {/* Multi-Account Capacity Banner (Minimalist Black & White) */}
      {stats && (
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Connected Accounts
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {stats.totalProfiles}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Total Pool Daily Cap
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {stats.totalCapacity} <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Shorts/day</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Uploaded Today
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {stats.totalUsedToday}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Remaining Quota
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {stats.totalRemaining}
            </div>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          style={{
            background: activeTab === 'accounts' ? '#FFFFFF' : 'transparent',
            border: activeTab === 'accounts' ? 'none' : '1px solid var(--card-border)',
            color: activeTab === 'accounts' ? '#000000' : 'var(--text-muted)',
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer'
          }}
        >
          Connected Accounts ({profiles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('link')}
          style={{
            background: activeTab === 'link' ? '#FFFFFF' : 'transparent',
            border: activeTab === 'link' ? 'none' : '1px solid var(--card-border)',
            color: activeTab === 'link' ? '#000000' : 'var(--text-muted)',
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer'
          }}
        >
          ➕ Link Google Account
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          style={{
            background: activeTab === 'logs' ? '#FFFFFF' : 'transparent',
            border: activeTab === 'logs' ? 'none' : '1px solid var(--card-border)',
            color: activeTab === 'logs' ? '#000000' : 'var(--text-muted)',
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer'
          }}
        >
          Rotation Logs ({rotationLogs.length})
        </button>
      </div>

      {/* TAB 1: CONNECTED ACCOUNTS LIST */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {profiles.map((prof, index) => {
            const isActive = prof.status === 'ACTIVE';
            const isExhausted = prof.status === 'EXHAUSTED' || (prof.usedToday >= prof.dailyLimit);
            const percent = Math.min(100, Math.round(((prof.usedToday || 0) / (prof.dailyLimit || 85)) * 100));

            return (
              <div 
                key={prof.id}
                style={{
                  background: isActive ? '#141414' : 'var(--bg-subtle)',
                  border: `1px solid ${isActive ? '#FFFFFF' : 'var(--card-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.9rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                {/* Account Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '6px',
                    background: isActive ? '#FFFFFF' : '#1A1A1A',
                    color: isActive ? '#000000' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 900
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#FFFFFF' }}>
                        {prof.name}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: isActive ? '#FFFFFF' : '#1A1A1A',
                        color: isActive ? '#000000' : 'var(--text-muted)',
                        border: `1px solid ${isActive ? '#FFFFFF' : '#333333'}`
                      }}>
                        {isActive ? 'ACTIVE WORKER' : (isExhausted ? 'QUOTA EXHAUSTED' : 'STANDBY')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span style={{ color: '#FFFFFF' }}>{prof.handle}</span> &bull; {prof.email}
                    </div>
                  </div>
                </div>

                {/* Quota Progress */}
                <div style={{ minWidth: '160px', flex: 1, maxWidth: '220px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '3px', color: 'var(--text-muted)' }}>
                    <span>Quota Used</span>
                    <strong style={{ color: '#FFFFFF' }}>{prof.usedToday || 0} / {prof.dailyLimit || 85}</strong>
                  </div>
                  <div style={{ height: '4px', background: '#222222', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: '#FFFFFF',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => handleSelectActive(prof.id)}
                      style={{
                        background: '#FFFFFF',
                        border: 'none',
                        color: '#000000',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 800,
                        fontSize: '0.75rem',
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
                      border: '1px solid #333333',
                      color: 'var(--text-muted)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                    title="Reset daily counter"
                  >
                    Reset
                  </button>
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(prof.id, prof.handle)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #333333',
                        color: 'var(--text-dim)',
                        padding: '0.35rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                      title="Remove from pool"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: LINK GOOGLE CLOUD ACCOUNT FORM */}
      {activeTab === 'link' && (
        <div>
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', color: '#FFFFFF' }}>
              Connect via Google Cloud Console OAuth
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Authorize a new YouTube channel through Google's OAuth consent screen.
            </p>
            <button
              type="button"
              onClick={handleLaunchGoogleOAuth}
              style={{
                background: '#FFFFFF',
                border: 'none',
                color: '#000000',
                padding: '0.65rem 1.4rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              🚀 Launch Google OAuth Authorization
            </button>
          </div>

          <form onSubmit={handleAddAccountSubmit} style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '0.75rem', color: '#FFFFFF' }}>
              Or Register Custom Channel Profile Manually:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
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
                    padding: '0.55rem',
                    background: 'var(--bg-warm)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Handle (@)
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@ViralShortsOfficial"
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    background: 'var(--bg-warm)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Channel Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@youtube.com"
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    background: 'var(--bg-warm)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Daily Limit (Default: 85)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    background: 'var(--bg-warm)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                background: '#FFFFFF',
                border: 'none',
                color: '#000000',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              ➕ Save Account to Pool
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: ROTATION LOGS */}
      {activeTab === 'logs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Audit trail of intelligent auto-switches when quota limits or 403 errors occur.
            </span>
            <button
              type="button"
              onClick={() => { clearRotationLogs(); refreshState(); }}
              style={{
                background: 'transparent',
                border: '1px solid #333333',
                color: 'var(--text-muted)',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              Clear Logs
            </button>
          </div>

          {rotationLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No rotation failovers logged yet. Auto-switches will appear here in real-time.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
              {rotationLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#FFFFFF', fontWeight: 800 }}>
                      ⚡ {log.fromProfile} ➔ {log.toProfile}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                      {log.readableTime}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    <strong>Trigger:</strong> {log.reason}
                  </div>
                  {log.clipTitle && (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginTop: '2px' }}>
                      Clip: {log.clipTitle}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
