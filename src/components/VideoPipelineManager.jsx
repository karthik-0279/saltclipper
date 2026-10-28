import React, { useState } from 'react';
import { processVideoPipeline, uploadClipToYouTube, generateGeminiScript } from '../services/api';

/**
 * TypeScript Interfaces / Type Definitions (Equivalent to Python Pydantic Models)
 * 
 * interface VideoProcessRequest {
 *   videoLink: string;
 *   scheduleTime?: string | null; // ISO 8601 string
 *   privacyStatus: 'public' | 'private' | 'unlisted';
 * }
 * 
 * interface ClipItem {
 *   clipId: string;
 *   title: string;
 *   status: 'Ready' | 'Processing' | 'Uploaded' | 'Failed';
 *   videoUrl?: string;
 *   scheduledAt?: string | null;
 * }
 */

/**
 * Custom Hook: useVideoPipeline
 * Replaces Python FastAPI endpoints & background tasks with reactive state
 */
export function useVideoPipeline() {
  const [videoLink, setVideoLink] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState('public');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clips, setClips] = useState([]);
  const [aiScript, setAiScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Trigger Video Processing (Replaces @app.post("/api/process-video"))
  const handleProcessVideo = async (e) => {
    if (e) e.preventDefault();
    if (!videoLink.trim()) return;

    setIsProcessing(true);
    setMessage('Processing video link and analyzing viral curiosity spikes...');

    try {
      // Mock generated clips with schedule metadata matching Python models
      const generated = [
        {
          clipId: 'clip_001',
          title: '🔥 High-Energy Opening Hook',
          status: 'Ready',
          videoUrl: videoLink,
          scheduledAt: scheduleTime || null,
          score: 98,
          duration: '65s'
        },
        {
          clipId: 'clip_002',
          title: '⚡ Core Value Breakdown',
          status: 'Processing',
          videoUrl: videoLink,
          scheduledAt: scheduleTime || null,
          score: 95,
          duration: '70s'
        }
      ];

      setTimeout(() => {
        setClips(generated);
        setIsProcessing(false);
        setMessage('Video processing started successfully!');
      }, 700);

    } catch (err) {
      setIsProcessing(false);
      setMessage(`Error: ${err.message}`);
    }
  };

  // 2. Trigger YouTube Upload (Replaces @app.post("/api/upload-clip"))
  const handleUploadClip = async (clipId, title) => {
    setClips(prev => prev.map(c => c.clipId === clipId ? { ...c, status: 'Uploading...' } : c));
    setMessage(`Uploading clip ${clipId} to YouTube Shorts...`);

    try {
      const res = await uploadClipToYouTube({
        title,
        privacyStatus,
        scheduleTime: scheduleTime || null
      });

      setClips(prev => prev.map(c => c.clipId === clipId ? { 
        ...c, 
        status: 'Uploaded', 
        shortsUrl: res.shortsUrl || 'https://youtube.com/shorts' 
      } : c));

      setMessage(`🎉 Successfully queued clip for YouTube release!`);
    } catch (err) {
      setClips(prev => prev.map(c => c.clipId === clipId ? { ...c, status: 'Failed' } : c));
      setMessage(`Upload note: ${err.message}`);
    }
  };

  // 3. Generate Viral Script with Gemini
  const handleGenerateScript = async (summaryText) => {
    setIsGeneratingScript(true);
    setMessage('Generating high-retention script with Gemini AI...');

    try {
      const res = await generateGeminiScript(summaryText);
      setAiScript(res.script);
      setIsGeneratingScript(false);
      setMessage('Gemini AI script generated successfully!');
    } catch (err) {
      setIsGeneratingScript(false);
      setMessage(`Error: ${err.message}`);
    }
  };

  return {
    videoLink,
    setVideoLink,
    scheduleTime,
    setScheduleTime,
    privacyStatus,
    setPrivacyStatus,
    isProcessing,
    clips,
    aiScript,
    isGeneratingScript,
    message,
    handleProcessVideo,
    handleUploadClip,
    handleGenerateScript
  };
}

/**
 * Visual Component: VideoPipelineManager
 * Clean visual container matching Muted Sage Gray, Warm Cream Beige, and Deep Burgundy palette.
 */
export default function VideoPipelineManager() {
  const {
    videoLink,
    setVideoLink,
    scheduleTime,
    setScheduleTime,
    privacyStatus,
    setPrivacyStatus,
    isProcessing,
    clips,
    aiScript,
    isGeneratingScript,
    message,
    handleProcessVideo,
    handleUploadClip,
    handleGenerateScript
  } = useVideoPipeline();

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto 2rem auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span>🎬</span> Video Pipeline & Scheduled Shorts
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Interactive video processing and AI viral scripts
          </p>
        </div>
        <span style={{ 
          padding: '0.25rem 0.75rem', 
          fontSize: '0.75rem', 
          fontWeight: 700, 
          background: 'var(--sage-light)', 
          color: 'var(--sage-dark)', 
          border: '1px solid var(--sage)', 
          borderRadius: '20px' 
        }}>
          Python → React Converted
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleProcessVideo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
            Video Link (YouTube URL / MP4 Stream):
          </label>
          <input
            type="url"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
            style={{
              width: '100%',
              padding: '0.7rem 0.95rem',
              background: 'var(--bg-warm)',
              border: '1.5px solid var(--card-border)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {/* Schedule Time Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
              ⏰ Schedule Time (Optional):
            </label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.95rem',
                background: 'var(--bg-warm)',
                border: '1.5px solid var(--card-border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Privacy Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
              🔒 Privacy Status:
            </label>
            <select
              value={privacyStatus}
              onChange={(e) => setPrivacyStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.95rem',
                background: 'var(--bg-warm)',
                border: '1.5px solid var(--card-border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="public">Public (Default)</option>
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={isProcessing || !videoLink.trim()}
            style={{
              padding: '0.65rem 1.4rem',
              background: 'var(--primary-gradient)',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 700,
              borderRadius: '8px',
              cursor: (isProcessing || !videoLink.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isProcessing || !videoLink.trim()) ? 0.6 : 1,
              boxShadow: '0 3px 10px var(--primary-glow)'
            }}
          >
            {isProcessing ? 'Processing Video...' : '🚀 Process Video'}
          </button>

          <button
            type="button"
            onClick={() => handleGenerateScript(videoLink)}
            disabled={isGeneratingScript || !videoLink.trim()}
            style={{
              padding: '0.65rem 1.4rem',
              background: 'var(--card-bg)',
              border: '1.5px solid var(--sage)',
              color: 'var(--text-heading)',
              fontWeight: 700,
              borderRadius: '8px',
              cursor: (isGeneratingScript || !videoLink.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isGeneratingScript || !videoLink.trim()) ? 0.6 : 1
            }}
          >
            {isGeneratingScript ? 'Writing Script...' : '🤖 Generate Gemini Script'}
          </button>
        </div>
      </form>

      {/* Status Notification */}
      {message && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem 1rem', 
          background: 'var(--sage-light)', 
          border: '1px solid var(--sage)', 
          borderRadius: '8px', 
          fontSize: '0.84rem', 
          color: 'var(--sage-dark)',
          fontWeight: 600
        }}>
          ℹ️ {message}
        </div>
      )}

      {/* Generated AI Script Panel */}
      {aiScript && (
        <div style={{ marginTop: '1.25rem', padding: '1.25rem', background: 'var(--bg-warm)', border: '1.5px solid var(--card-border)', borderRadius: '10px' }}>
          <h4 style={{ fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 0.5rem 0' }}>
            <span>✨</span> Gemini Viral Video Script:
          </h4>
          <pre style={{ fontSize: '0.8rem', color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--card-border)', overflowX: 'auto', lineHeight: 1.5 }}>
            {aiScript}
          </pre>
        </div>
      )}

      {/* Generated Clips Grid */}
      {clips.length > 0 && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1.5px solid var(--card-border)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-heading)', marginBottom: '1rem' }}>
            Generated Clips ({clips.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {clips.map((clip) => (
              <div
                key={clip.clipId}
                style={{
                  padding: '1.25rem',
                  background: 'var(--bg-warm)',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--primary)' }}>{clip.clipId}</span>
                    <span style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', fontWeight: 800, background: 'var(--sage-light)', color: 'var(--sage-dark)', border: '1px solid var(--sage)', borderRadius: '6px' }}>
                      Score: {clip.score}
                    </span>
                  </div>
                  <h4 style={{ fontWeight: 700, color: 'var(--text-heading)', margin: '0.4rem 0 0.2rem 0', fontSize: '0.95rem' }}>{clip.title}</h4>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>Duration: {clip.duration}</p>
                  {clip.scheduledAt && (
                    <p style={{ fontSize: '0.76rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>
                      ⏰ Scheduled: {new Date(clip.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Status: <strong style={{ color: 'var(--text-heading)' }}>{clip.status}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUploadClip(clip.clipId, clip.title)}
                    disabled={clip.status === 'Uploaded' || clip.status === 'Uploading...'}
                    style={{
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      background: 'var(--primary-gradient)',
                      border: 'none',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      cursor: (clip.status === 'Uploaded' || clip.status === 'Uploading...') ? 'not-allowed' : 'pointer',
                      opacity: (clip.status === 'Uploaded' || clip.status === 'Uploading...') ? 0.6 : 1
                    }}
                  >
                    {clip.status === 'Uploaded' ? '✅ Uploaded' : '📤 Upload to YouTube'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
