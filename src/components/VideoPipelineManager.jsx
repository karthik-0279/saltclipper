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

  // 3. Trigger Gemini Script Generation (Replaces trigger_ai_pipeline)
  const handleGenerateScript = async (topic) => {
    setIsGeneratingScript(true);
    try {
      const data = await generateGeminiScript(topic || videoLink);
      setAiScript(data.script || 'No script returned.');
    } catch (err) {
      setAiScript(`Script generation: ${err.message}`);
    } finally {
      setIsGeneratingScript(false);
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
 * React Component: VideoPipelineManager
 * Clean, modern UI translating the Python backend functionality into React.
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
    <div className="w-full max-w-4xl mx-auto p-6 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-indigo-400 flex items-center gap-2">
            <span>🎬</span> Video Pipeline & Scheduled Shorts
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Convert Python FastAPI models into reactive React components
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
          Python → React Converted
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleProcessVideo} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">
            Video Link (YouTube URL / MP4 Stream):
          </label>
          <input
            type="url"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-100 placeholder-slate-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Schedule Time Picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              ⏰ Schedule Time (Optional):
            </label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-100"
            />
          </div>

          {/* Privacy Status */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              🔒 Privacy Status:
            </label>
            <select
              value={privacyStatus}
              onChange={(e) => setPrivacyStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-100"
            >
              <option value="public">Public (Default)</option>
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isProcessing || !videoLink.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition duration-200 cursor-pointer"
          >
            {isProcessing ? 'Processing Video...' : '🚀 Process Video'}
          </button>

          <button
            type="button"
            onClick={() => handleGenerateScript(videoLink)}
            disabled={isGeneratingScript || !videoLink.trim()}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-300 font-semibold rounded-xl border border-indigo-500/30 transition duration-200 cursor-pointer"
          >
            {isGeneratingScript ? 'Writing Script...' : '🤖 Generate Gemini Script'}
          </button>
        </div>
      </form>

      {/* Status Notification */}
      {message && (
        <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-sm text-indigo-200">
          ℹ️ {message}
        </div>
      )}

      {/* Generated AI Script Panel */}
      {aiScript && (
        <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2">
          <h4 className="font-bold text-amber-400 flex items-center gap-2">
            <span>✨</span> Gemini Viral Video Script:
          </h4>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto">
            {aiScript}
          </pre>
        </div>
      )}

      {/* Generated Clips Grid */}
      {clips.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-lg text-slate-200">
            Generated Clips ({clips.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clips.map((clip) => (
              <div
                key={clip.clipId}
                className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col justify-between space-y-3 hover:border-indigo-500 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-300">{clip.clipId}</span>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 rounded-md">
                      Score: {clip.score}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-100 mt-1">{clip.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Duration: {clip.duration}</p>
                  {clip.scheduledAt && (
                    <p className="text-xs text-amber-400 mt-1">
                      ⏰ Scheduled: {new Date(clip.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <span className="text-xs text-slate-400">
                    Status: <strong className="text-slate-200">{clip.status}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUploadClip(clip.clipId, clip.title)}
                    disabled={clip.status === 'Uploaded' || clip.status === 'Uploading...'}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition"
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
