import React, { useState, useEffect } from 'react';
import {
  getYoutubeProfiles,
  getActiveProfile,
  setActiveProfile,
  updateProjectCredentials,
  resetProfileQuota,
  resetAllProfilesQuota,
  getRotationLogs,
  clearRotationLogs,
  rotateToNextProfile,
  getMultiAccountStats
} from '../services/profileManager';

/**
 * GoogleProjectsManager Component
 * 
 * Minimalist Black & White Theme (Single-Page Expanded Layout):
 * - Direct inline dashboard to manage up to 5 Google Cloud Console Projects.
 * - Stores Project ID, Client ID, Client Secret, API Key, and Linked YouTube Channel Handle in localStorage.
 * - Intelligent Quota Auto-Switch (Zero Limit Waste):
 *   If Project 1 encounters a 403 Quota Exceeded error or hits its daily limit,
 *   the system automatically rotates to Project 2 (and onwards to Project 5).
 * - Zero Popups or Modals: All inputs expand vertically and inline.
 */
export default function GoogleProjectsManager({ onShowToast }) {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [rotationLogs, setRotationLogs] = useState([]);
  const [editingProjectId, setEditingProjectId] = useState(null);

  // Form edit state for currently edited project
  const [editFormData, setEditFormData] = useState({
    projectId: '',
    projectName: '',
    handle: '',
    email: '',
    clientId: '',
    clientSecret: '',
    apiKey: '',
    dailyLimit: 85
  });

  const refreshState = () => {
    const projs = getYoutubeProfiles();
    const st = getMultiAccountStats();
    const logs = getRotationLogs();
    setProjects(projs);
    setStats(st);
    setRotationLogs(logs);
  };

  useEffect(() => {
    refreshState();
  }, []);

  // 1. Switch Active Project
  const handleSelectActive = (projectId, projectName) => {
    setActiveProfile(projectId);
    refreshState();
    if (onShowToast) {
      onShowToast(`Switched active uploader to ${projectName || projectId}.`);
    }
  };

  // 2. Open inline edit form for a project
  const handleStartEdit = (proj) => {
    setEditingProjectId(proj.id);
    setEditFormData({
      projectId: proj.projectId || '',
      projectName: proj.projectName || proj.name || '',
      handle: proj.handle || '',
      email: proj.email || '',
      clientId: proj.clientId || '',
      clientSecret: proj.clientSecret || '',
      apiKey: proj.apiKey || '',
      dailyLimit: proj.dailyLimit || 85
    });
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
  };

  // 3. Save project credentials to localStorage
  const handleSaveCredentials = (projectId) => {
    updateProjectCredentials(projectId, editFormData);
    setEditingProjectId(null);
    refreshState();
    if (onShowToast) {
      onShowToast(`✅ Credentials for ${editFormData.projectName || projectId} saved to localStorage!`);
    }
  };

  // 4. Test 403 Auto-Switch Trigger
  const handleTestFailover = () => {
    const res = rotateToNextProfile('Simulated 403 Quota Exceeded error — Zero Limit Waste Triggered');
    refreshState();
    if (onShowToast) {
      onShowToast(res.message);
    }
  };

  // 5. Reset Quotas
  const handleResetOne = (projectId, projectName) => {
    resetProfileQuota(projectId);
    refreshState();
    if (onShowToast) {
      onShowToast(`Reset daily quota counter for ${projectName}.`);
    }
  };

  const handleResetAll = () => {
    resetAllProfilesQuota();
    refreshState();
    if (onShowToast) {
      onShowToast('All 5 Google Cloud Projects daily quotas reset to 0!');
    }
  };

  return (
    <section id="projects-section" className="card" style={{ marginTop: '2.5rem' }}>
      {/* Anchor for backward compatibility */}
      <span id="accounts-section" />

      {/* Section Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--card-border)',
        paddingBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            background: '#FFFFFF',
            color: '#000000',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 900
          }}>
            ☁
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Google Cloud Console Projects Rotation (5 Projects)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              Automatic 403 Failover &bull; Zero Limit Waste &bull; Continuous 20+ Clips Pipeline
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleTestFailover}
            style={{
              background: '#FFFFFF',
              border: 'none',
              color: '#000000',
              padding: '0.5rem 0.95rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
            title="Simulate a 403 Quota Exceeded error on current project to verify instant rotation to the next project"
          >
            ⚡ Test 403 Auto-Switch
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            style={{
              background: 'transparent',
              border: '1px solid var(--card-border)',
              color: '#FFFFFF',
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🔄 Reset All 5 Quotas
          </button>
        </div>
      </div>

      {/* Aggregate Stats Summary */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          padding: '1rem',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--card-border)',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Configured Cloud Projects
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', marginTop: '3px' }}>
              {projects.length} Projects
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Total Multi-Project Capacity
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', marginTop: '3px' }}>
              {stats.totalCapacity} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Shorts/day</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Uploaded Today
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', marginTop: '3px' }}>
              {stats.totalUsedToday}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Pool Remaining
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', marginTop: '3px' }}>
              {stats.totalRemaining}
            </div>
          </div>
        </div>
      )}

      {/* The 5 Google Cloud Projects List (Expanded Vertically, Zero Modals) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {projects.map((proj, idx) => {
          const isActive = proj.status === 'ACTIVE';
          const isExhausted = proj.status === 'EXHAUSTED' || (proj.usedToday >= proj.dailyLimit);
          const percent = Math.min(100, Math.round(((proj.usedToday || 0) / (proj.dailyLimit || 85)) * 100));
          const isEditing = editingProjectId === proj.id;

          return (
            <div
              key={proj.id}
              style={{
                background: isActive ? '#141414' : 'var(--bg-subtle)',
                border: `1px solid ${isActive ? '#FFFFFF' : 'var(--card-border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Project Title Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: isActive ? '#FFFFFF' : '#222222',
                    color: isActive ? '#000000' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.88rem'
                  }}>
                    P{idx + 1}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#FFFFFF' }}>
                        {proj.projectName || `Google Cloud Project ${idx + 1}`}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '10px',
                        background: isActive ? '#FFFFFF' : (isExhausted ? '#222222' : 'transparent'),
                        color: isActive ? '#000000' : (isExhausted ? '#AAAAAA' : 'var(--text-muted)'),
                        border: `1px solid ${isActive ? '#FFFFFF' : 'var(--card-border)'}`
                      }}>
                        {isActive ? 'ACTIVE UPLOADER' : (isExhausted ? 'QUOTA EXHAUSTED' : 'STANDBY (IN ROTATION)')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{proj.projectId || `proj-${idx + 1}`}</span> &bull; Channel: <span style={{ color: '#FFFFFF' }}>{proj.handle}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => handleSelectActive(proj.id, proj.projectName)}
                      style={{
                        background: '#FFFFFF',
                        border: 'none',
                        color: '#000000',
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Set As Active
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => isEditing ? handleCancelEdit() : handleStartEdit(proj)}
                    style={{
                      background: isEditing ? '#222222' : 'transparent',
                      border: '1px solid var(--card-border)',
                      color: '#FFFFFF',
                      padding: '0.4rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isEditing ? 'Close' : 'Edit Credentials'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetOne(proj.id, proj.projectName)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-muted)',
                      padding: '0.4rem 0.7rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                    title="Reset daily quota usage"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Quota Usage Meter */}
              <div style={{ marginBottom: isEditing ? '1.25rem' : '0' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.74rem',
                  marginBottom: '4px',
                  color: 'var(--text-muted)'
                }}>
                  <span>Project Quota Consumption</span>
                  <span style={{ color: '#FFFFFF', fontWeight: 800 }}>
                    {proj.usedToday || 0} / {proj.dailyLimit || 85} Shorts ({percent}%)
                  </span>
                </div>
                <div style={{ height: '5px', background: '#222222', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: '#FFFFFF',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* Inline Credential Editor (Expanded directly on the page) */}
              {isEditing && (
                <div style={{
                  marginTop: '1.25rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--card-border)',
                  background: 'var(--bg-warm)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#FFFFFF', marginBottom: '0.85rem' }}>
                    Edit Credentials for Project #{idx + 1} (Saved in localStorage):
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                        Google Cloud Project ID
                      </label>
                      <input
                        type="text"
                        value={editFormData.projectId}
                        onChange={(e) => setEditFormData({ ...editFormData, projectId: e.target.value })}
                        placeholder="e.g. saltclipper-prod-01"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                        Project Display Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.projectName}
                        onChange={(e) => setEditFormData({ ...editFormData, projectName: e.target.value })}
                        placeholder="Google Cloud Project Name"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                        OAuth 2.0 Client ID
                      </label>
                      <input
                        type="text"
                        value={editFormData.clientId}
                        onChange={(e) => setEditFormData({ ...editFormData, clientId: e.target.value })}
                        placeholder="xxxx.apps.googleusercontent.com"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                        OAuth 2.0 Client Secret
                      </label>
                      <input
                        type="password"
                        value={editFormData.clientSecret}
                        onChange={(e) => setEditFormData({ ...editFormData, clientSecret: e.target.value })}
                        placeholder="GOCSPX-xxxxxx"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                        YouTube API Key
                      </label>
                      <input
                        type="password"
                        value={editFormData.apiKey}
                        onChange={(e) => setEditFormData({ ...editFormData, apiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                        Linked Channel Handle
                      </label>
                      <input
                        type="text"
                        value={editFormData.handle}
                        onChange={(e) => setEditFormData({ ...editFormData, handle: e.target.value })}
                        placeholder="@ChannelHandle"
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--card-border)',
                        color: 'var(--text-muted)',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCredentials(proj.id)}
                      style={{
                        background: '#FFFFFF',
                        border: 'none',
                        color: '#000000',
                        padding: '0.5rem 1.25rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Save Project Credentials
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rotation Audit Log (Inline Expanded Table) */}
      <div style={{ marginTop: '2rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Live 403 Auto-Switch Audit Trail ({rotationLogs.length})
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Real-time records of intelligent failover when 403 errors or daily caps occur
            </p>
          </div>
          {rotationLogs.length > 0 && (
            <button
              type="button"
              onClick={() => { clearRotationLogs(); refreshState(); }}
              style={{
                background: 'transparent',
                border: '1px solid var(--card-border)',
                color: 'var(--text-muted)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.74rem',
                cursor: 'pointer'
              }}
            >
              Clear Log History
            </button>
          )}
        </div>

        {rotationLogs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)'
          }}>
            No quota failover events logged yet. If Project 1 hits 403, it will automatically switch to Project 2 and record here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {rotationLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <span style={{ color: '#FFFFFF', fontWeight: 800 }}>
                    ⚡ {log.fromProfile} ➔ {log.toProfile}
                  </span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '10px' }}>
                    Trigger: {log.reason}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {log.readableTime}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
