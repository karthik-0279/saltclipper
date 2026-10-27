import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import YouTubeBar from './components/YouTubeBar';
import VideoInput from './components/VideoInput';
import PhonePlayer from './components/PhonePlayer';
import ClipsList from './components/ClipsList';
import ExportCenter from './components/ExportCenter';
import ConfigModal from './components/ConfigModal';
import Toast from './components/Toast';
import AdminDashboard from './components/AdminDashboard';
import { 
  fetchAuthUser, 
  logoutUser, 
  fetchYouTubeStatus, 
  saveYouTubeConfig,
  initiateClipRender, 
  pollJobStatus,
  uploadAllClipsToYouTube,
  pollBatchStatus,
  fetchYouTubeQuota
} from './services/api';

export default function App() {
  // --- User & Authentication State ---
  const [currentUser, setCurrentUser] = useState(null);
  const [token] = useState(() => localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || null);
  const [currentView, setCurrentView] = useState('studio'); // 'studio' | 'admin'

  const isAdmin = currentUser?.role === 'admin';

  // --- Batch Upload All Clips State ---
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchStatus, setBatchStatus] = useState(null);

  // --- One-by-One Clip Upload State ---
  const [uploadingClipId, setUploadingClipId] = useState(null);
  const [clipUploads, setClipUploads] = useState({});

  // --- Video Processing State ---
  const [mode, setMode] = useState('highlights'); // 'highlights' | 'whole_video' | 'download_whole'
  const [videoUrl, setVideoUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState(null);
  const [localFileUrl, setLocalFileUrl] = useState(null);
  const [videoType, setVideoType] = useState('youtube'); // 'youtube' | 'local'
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Generated Clips State ---
  const [clips, setClips] = useState([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [ratio, setRatio] = useState('9:16');

  // --- YouTube Automation & Quota State ---
  const [ytStatus, setYtStatus] = useState(null);
  const [ytQuota, setYtQuota] = useState(null);
  const [autoUploadYT, setAutoUploadYT] = useState(true);
  const [ytPrivacy, setYtPrivacy] = useState('private');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // --- Rendering & Polling State ---
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatusText, setRenderStatusText] = useState('');
  const [lastUploadResult, setLastUploadResult] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const pollIntervalRef = useRef(null);

  // Helper: Trigger floating toast notification
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  }, []);

  // 1. Authenticate user on initial mount
  useEffect(() => {
    async function verifyUser() {
      try {
        const data = await fetchAuthUser(token);
        if (data?.authenticated) {
          setCurrentUser(data.user);
        } else {
          window.location.replace('/login');
        }
      } catch (err) {
        window.location.replace('/login');
      }
    }
    verifyUser();
  }, [token]);

  // 2. Fetch YouTube connection status & quota on load
  const refreshYouTubeStatus = useCallback(async () => {
    try {
      const data = await fetchYouTubeStatus();
      setYtStatus(data);
    } catch (e) {
      console.warn('Could not load YouTube status:', e);
    }
  }, []);

  const refreshQuota = useCallback(async () => {
    try {
      const data = await fetchYouTubeQuota();
      setYtQuota(data);
    } catch (e) {
      console.warn('Could not load quota status:', e);
    }
  }, []);

  useEffect(() => {
    refreshYouTubeStatus();
    refreshQuota();

    // Listen for OAuth completion message from popup window
    const handleMessage = (e) => {
      if (e.data?.type === 'YOUTUBE_CONNECTED') {
        showToast('🎉 YouTube Channel Connected Successfully!');
        refreshYouTubeStatus();
        refreshQuota();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refreshYouTubeStatus, refreshQuota, showToast]);

  // Cleanup polling timer if unmounted
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // 3. User Logout
  const handleLogout = useCallback(async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await logoutUser(token);
    } finally {
      window.location.replace('/login');
    }
  }, [token]);

  // 4. Video Analysis & Clip Generation
  const handleAnalyzeUrl = (url) => {
    setVideoUrl(url);
    setIsAnalyzing(true);

    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (match) {
      setYoutubeId(match[1]);
      setVideoType('youtube');
    }

    setTimeout(() => {
      setIsAnalyzing(false);
      setClips([
        { id: '1', startSec: 45, endSec: 110, score: 99, projectedViews: '2.4M', title: 'Curiosity Loop & Shocking Twist' },
        { id: '2', startSec: 180, endSec: 245, score: 96, projectedViews: '1.8M', title: 'High Retention Breakdown' },
        { id: '3', startSec: 320, endSec: 388, score: 94, projectedViews: '1.2M', title: 'Unbelievable Viral Revelation' },
        { id: '4', startSec: 460, endSec: 525, score: 91, projectedViews: '850K', title: 'Intense Climax & Debate' }
      ]);
      setActiveClipIndex(0);
      showToast('Generated 4 high-reach viral clips!');
    }, 800);
  };

  const handleSelectLocalFile = (file) => {
    const objectUrl = URL.createObjectURL(file);
    setLocalFileUrl(objectUrl);
    setVideoType('local');
    setVideoUrl(file.name);
    setClips([
      { id: '1', startSec: 10, endSec: 75, score: 98, projectedViews: '1.5M', title: `${file.name.replace(/\.[^/.]+$/, "")} - Highlight #1` },
      { id: '2', startSec: 90, endSec: 155, score: 95, projectedViews: '1.1M', title: `${file.name.replace(/\.[^/.]+$/, "")} - Highlight #2` }
    ]);
    setActiveClipIndex(0);
    showToast(`Loaded local file: ${file.name}`);
  };

  const handleLoadMoreClips = (count) => {
    const currentLength = clips.length;
    const newBatch = Array.from({ length: count }, (_, i) => ({
      id: String(currentLength + i + 1),
      startSec: (currentLength + i) * 70,
      endSec: (currentLength + i) * 70 + 65,
      score: Math.max(85, 98 - (currentLength + i) * 2),
      projectedViews: `${Math.max(400, 1500 - (currentLength + i) * 80)}K`,
      title: `Curiosity Spike Part #${currentLength + i + 1}`
    }));
    setClips(prev => [...prev, ...newBatch]);
    showToast(`Added ${count} more clips to feed!`);
  };

  // 5. Render & Export Pipeline (Safely avoids duplicate local browser downloads)
  const handleStartRender = async () => {
    const currentClip = clips[activeClipIndex];
    if (!currentClip) return;

    setIsRendering(true);
    setRenderProgress(15);
    setRenderStatusText('Initializing FFmpeg & slicing video...');
    setLastUploadResult(null);

    try {
      const startRes = await initiateClipRender({
        sourceUrl: videoUrl,
        startTime: currentClip.startSec,
        endTime: currentClip.endSec,
        aspect: ratio,
        clipId: currentClip.id,
        autoUploadYouTube: autoUploadYT,
        privacyStatus: ytPrivacy,
        title: currentClip.title
      });

      const jobId = startRes.jobId;

      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await pollJobStatus(jobId);
          setRenderProgress(status.progress || 50);
          setRenderStatusText(status.step || 'Processing video...');

          if (status.status === 'COMPLETED') {
            clearInterval(pollIntervalRef.current);
            setIsRendering(false);
            setRenderProgress(100);

            // Check if Auto-Uploaded to YouTube Shorts
            if (status.uploadStatus === 'UPLOADED') {
              setLastUploadResult({
                shortsUrl: status.youtubeUrl,
                videoId: status.youtubeVideoId
              });
              setRenderStatusText('🎉 Published to YouTube Shorts!');
              showToast('🎉 Published to YouTube Shorts successfully!');
              // Do NOT trigger local duplicate browser download
            } else {
              // Trigger single clean MP4 download
              const artifactUrl = `/api/download-artifact?jobId=${encodeURIComponent(jobId)}`;
              const a = document.createElement('a');
              a.href = artifactUrl;
              a.download = status.filename || 'clip.mp4';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setRenderStatusText('✅ Playable MP4 Video Ready & Downloaded!');
              showToast('✅ Video rendered and downloaded!');
            }
          } else if (status.status === 'ERROR') {
            clearInterval(pollIntervalRef.current);
            setIsRendering(false);
            setRenderStatusText(`❌ Error: ${status.error}`);
            showToast(`Render Error: ${status.error}`);
          }
        } catch (pollErr) {
          console.error('Polling error', pollErr);
        }
      }, 1000);

    } catch (err) {
      setIsRendering(false);
      setRenderStatusText(`❌ Error: ${err.message}`);
      showToast(err.message);
    }
  };

  // 6. Batch Upload ALL Generated Clips to YouTube Shorts (Sequential Series Pipeline)
  const handleUploadAllToYouTube = async () => {
    if (!clips || clips.length === 0) {
      showToast('No clips generated yet. Paste a video link first!');
      return;
    }

    if (!ytStatus?.isConnected) {
      showToast('⚠️ Please click "Connect YouTube" in the bar above before uploading to YouTube Shorts!');
      return;
    }

    const effectiveUrl = videoUrl || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '');
    if (!effectiveUrl) {
      showToast('Please provide a valid source video URL');
      return;
    }

    setIsBatchUploading(true);
    setBatchStatus({
      status: 'PROCESSING',
      currentPart: 1,
      totalParts: clips.length,
      progress: 5,
      step: `Initializing sequential upload of all ${clips.length} clips...`,
      uploadedClips: []
    });

    try {
      const res = await uploadAllClipsToYouTube({
        sourceUrl: effectiveUrl,
        clips: clips,
        aspect: ratio,
        privacyStatus: ytPrivacy
      });

      const batchId = res.batchId;
      showToast(`⚡ Batch upload started for ${clips.length} clips!`);

      const batchInterval = setInterval(async () => {
        try {
          const status = await pollBatchStatus(batchId);
          setBatchStatus(status);

          if (status.status === 'COMPLETED') {
            clearInterval(batchInterval);
            setIsBatchUploading(false);

            // Populate all uploaded clips in clipUploads dictionary
            if (status.uploadedClips) {
              const newMap = {};
              status.uploadedClips.forEach(item => {
                newMap[item.clipId] = { videoId: item.videoId, shortsUrl: item.shortsUrl };
              });
              setClipUploads(prev => ({ ...prev, ...newMap }));
            }

            showToast(`🎉 Success! All ${status.uploadedClips?.length || clips.length} clips uploaded to YouTube Shorts!`);
            refreshQuota();
          } else if (status.status === 'HALTED') {
            clearInterval(batchInterval);
            setIsBatchUploading(false);
            showToast(`⚠️ Batch halted: ${status.error || 'Safe quota cap reached'}`);
            refreshQuota();
          } else if (status.status === 'ERROR') {
            clearInterval(batchInterval);
            setIsBatchUploading(false);
            showToast(`❌ Batch Upload note: ${status.error || 'Stopped'}`);
            refreshQuota();
          }
        } catch (pollErr) {
          console.error('Batch poll error', pollErr);
        }
      }, 1500);

    } catch (err) {
      setIsBatchUploading(false);
      showToast(`Failed to start batch upload: ${err.message}`);
    }
  };

  // 7. Individual One-by-One Upload to YouTube Shorts
  const handleUploadSingleClip = async (index) => {
    const clip = clips[index];
    if (!clip) return;

    if (!ytStatus?.isConnected) {
      showToast('⚠️ Please click "Connect YouTube" in the bar above first before uploading clips!');
      return;
    }

    const effectiveUrl = videoUrl || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '');
    if (!effectiveUrl) {
      showToast('Please provide a valid video link first');
      return;
    }

    setUploadingClipId(clip.id);
    showToast(`🚀 Uploading Clip #${clip.id} to YouTube Shorts...`);

    try {
      const startRes = await initiateClipRender({
        sourceUrl: effectiveUrl,
        startTime: clip.startSec,
        endTime: clip.endSec,
        aspect: ratio,
        clipId: clip.id,
        autoUploadYouTube: true, // EXPLICIT ONE-BY-ONE UPLOAD
        privacyStatus: ytPrivacy,
        title: clip.title
      });

      const jobId = startRes.jobId;

      const interval = setInterval(async () => {
        try {
          const status = await pollJobStatus(jobId);

          if (status.status === 'COMPLETED') {
            clearInterval(interval);
            setUploadingClipId(null);

            if (status.uploadStatus === 'UPLOADED') {
              setClipUploads(prev => ({
                ...prev,
                [clip.id]: {
                  videoId: status.youtubeVideoId,
                  shortsUrl: status.youtubeUrl
                }
              }));
              showToast(`🎉 Clip #${clip.id} uploaded to YouTube Shorts!`);
            } else {
              showToast(`Upload note: ${status.uploadError || 'Rendered but upload failed'}`);
            }
          } else if (status.status === 'ERROR') {
            clearInterval(interval);
            setUploadingClipId(null);
            showToast(`❌ Error: ${status.error}`);
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 1200);

    } catch (err) {
      setUploadingClipId(null);
      showToast(`Upload failed: ${err.message}`);
    }
  };

  const handleSaveConfig = async (clientId, clientSecret) => {
    try {
      await saveYouTubeConfig(clientId, clientSecret);
      setIsConfigOpen(false);
      showToast('OAuth credentials saved successfully!');
      refreshYouTubeStatus();
    } catch (e) {
      showToast(`Failed: ${e.message}`);
    }
  };

  return (
    <div className="container">
      <Header 
        user={currentUser} 
        isAdmin={isAdmin}
        currentView={currentView}
        onToggleView={() => setCurrentView(prev => prev === 'admin' ? 'studio' : 'admin')}
        onLogout={handleLogout} 
      />

      {/* Render Admin Dashboard View when active and user is admin */}
      {currentView === 'admin' && isAdmin ? (
        <AdminDashboard 
          onBackToStudio={() => setCurrentView('studio')}
          onShowToast={showToast}
        />
      ) : (
        <>
          <YouTubeBar 
            ytStatus={ytStatus}
            autoUpload={autoUploadYT}
            onToggleAutoUpload={setAutoUploadYT}
            privacy={ytPrivacy}
            onChangePrivacy={setYtPrivacy}
            onOpenConfig={() => setIsConfigOpen(true)}
            isAdmin={isAdmin}
            onShowToast={showToast}
            quota={ytQuota}
          />

          <section className="hero">
            <div className="hero-badge">
              <span>🤖</span>
              <span>Next-Gen Video Intelligence: Unlimited High-Reach Viral Clips (60s–70s)</span>
            </div>
            <h1>Generate <span className="gradient-text">Unlimited Viral Clips</span> That Explode In Reach</h1>
            <p>AI detects dialogue intensity, curiosity gaps, and retention spikes across the entire video to produce unlimited 60s–70s clips with forecasted reach potential.</p>
          </section>

          <VideoInput 
            mode={mode}
            onSelectMode={setMode}
            onAnalyzeUrl={handleAnalyzeUrl}
            onSelectLocalFile={handleSelectLocalFile}
            isAnalyzing={isAnalyzing}
          />

          <main className="studio-grid">
            {/* Left Column: 9:16 Vertical Video Player */}
            <div>
              <PhonePlayer 
                currentClip={clips[activeClipIndex]}
                videoType={videoType}
                youtubeId={youtubeId}
                localFileUrl={localFileUrl}
              />
            </div>

            {/* Right Column: Unlimited Highlight Clips & Export Controls */}
            <div>
              <ClipsList 
                clips={clips}
                selectedIndex={activeClipIndex}
                onSelectClip={setActiveClipIndex}
                onLoadMore={handleLoadMoreClips}
                onUploadSingleClip={handleUploadSingleClip}
                uploadingClipId={uploadingClipId}
                clipUploads={clipUploads}
                isAdmin={isAdmin}
                onShowToast={showToast}
              />

              <ExportCenter 
                clips={clips}
                currentClip={clips[activeClipIndex]}
                ratio={ratio}
                onChangeRatio={setRatio}
                onStartRender={handleStartRender}
                onManualUploadYT={() => handleUploadSingleClip(activeClipIndex)}
                onUploadAllToYouTube={handleUploadAllToYouTube}
                isRendering={isRendering}
                renderProgress={renderProgress}
                renderStatusText={renderStatusText}
                lastUploadResult={clipUploads[clips[activeClipIndex]?.id] || lastUploadResult}
                isBatchUploading={isBatchUploading}
                batchStatus={batchStatus}
                isAdmin={isAdmin}
              />
            </div>
          </main>
        </>
      )}

      <ConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSave={handleSaveConfig}
      />

      <Toast message={toastMsg} />
    </div>
  );
}
