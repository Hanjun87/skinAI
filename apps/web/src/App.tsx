/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import Home from './pages/Home';
import CameraPage from './pages/Home/Camera';
import Analysis from './pages/Home/Analysis';
import Result from './pages/Home/Result';
import RecordsPage from './pages/Records';
import RecordDetailPage from './pages/Records/RecordDetail';
import { DiaryEntry } from './pages/Records/DiaryEntry';
import { History } from './pages/Records/History';

import ProfilePage from './pages/Profile';
import PlaceholderPage from './pages/Profile/PlaceholderPage';
import { CommunityFeed } from './pages/Community/CommunityFeed';
import { PostDetail } from './pages/Community/PostDetail';
import { ExpertColumn } from './pages/Community/ExpertColumn';
import { CreatePost } from './pages/Community/CreatePost';
import { Page, Record as SkinRecord, AnalysisResult } from './types';
import { BottomNav } from './components/common/BottomNav';
import { MessageSquare, Calendar, Settings, Info } from 'lucide-react';
import { cn } from './lib/utils';
import { getPageTransition, isTabPage, pagePresenceMode, resolveTransition } from './lib/transitions';

// --- Main App ---

export default function App() {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const buildApiUrl = (path: string) => `${apiBaseUrl}${path}`;
  const primaryTabs: Page[] = ['home', 'records', 'community', 'profile'];
  const pageRootMap: Record<Page, Page> = {
    home: 'home',
    camera: 'home',
    analysis: 'home',
    result: 'home',
    records: 'records',
    record_detail: 'records',
    diary: 'records',
    history: 'records',
    community: 'community',
    community_post_detail: 'community',
    community_expert: 'community',
    community_create: 'community',
    profile: 'profile',
    consultations: 'profile',
    appointments: 'profile',
    settings: 'profile',
    about: 'profile',
  };
  const [currentPage, _setCurrentPage] = useState<Page>('home');
  const reducedMotion = useReducedMotion();
  const [transitionState, setTransitionState] = useState(() => resolveTransition('home', 'home'));

  const getRootTab = (page: Page) => pageRootMap[page] ?? 'home';

  const setCurrentPage = (page: Page) => {
    if (page === currentPage) {
      return;
    }
    const currentRootTab = getRootTab(currentPage);
    const nextRootTab = getRootTab(page);
    setTransitionState(resolveTransition(currentPage, page));
    _setCurrentPage(page);
  };

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [records, setRecords] = useState<SkinRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SkinRecord | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingDiary, setIsSavingDiary] = useState(false);



  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // --- AI Logic ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        analyzeSkin(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeSkin = async (base64Image: string) => {
    setIsAnalyzing(true);
    setCurrentPage('analysis');

    try {
      const response = await fetch(buildApiUrl('/api/analyze-skin'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: base64Image
        })
      });
      if (!response.ok) {
        let errorMessage = '识别服务不可用';
        try {
          const errorData = await response.json();
          if (typeof errorData?.message === 'string' && errorData.message.trim()) {
            errorMessage = errorData.message;
          }
        } catch {
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();

      setAnalysisResult({
        diagnosis: data.diagnosis,
        probability: data.probability,
        userImage: base64Image,
        typicalImage: base64Image
      });
      setCurrentPage('result');
    } catch (error) {
      console.error("Analysis failed:", error);
      setCurrentPage('home');
      window.alert(error instanceof Error ? error.message : '识别失败，请稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveRecord = () => {
    if (!analysisResult) {
      return;
    }
    setIsSavingDiary(true);
    const newRecord: SkinRecord = {
      id: Date.now().toString(),
      title: analysisResult.diagnosis,
      date: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: '待复查',
      image: analysisResult.userImage,
      probability: analysisResult.probability,
      typicalImage: analysisResult.typicalImage
    };
    setRecords(prev => [newRecord, ...prev]);
    setTimeout(() => {
      setIsSavingDiary(false);
      setCurrentPage('records');
    }, 600);
  };

  // --- Camera Logic ---

  const startCamera = async () => {
    if (cameraLoading) return;
    setCameraError('');
    setCameraLoading(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('当前设备不支持相机调用');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('未获得摄像头权限，请在系统设置中允许相机访问后重试');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('未检测到可用摄像头');
      } else {
        setCameraError('相机启动失败，请重试');
      }
      setCameraReady(false);
      console.error("Error accessing camera:", err);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const takePhoto = () => {
    if (!cameraReady) {
      setCameraError('相机尚未就绪，请先授权并开启相机');
      return;
    }
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
        analyzeSkin(dataUrl);
      }
    }
  };

  useEffect(() => {
    if (currentPage === 'camera') {
      startCamera();
    } else {
      stopCamera();
      setCameraError('');
    }
    return () => stopCamera();
  }, [currentPage]);

  // --- Render Helpers ---

  const pageTransition = getPageTransition(transitionState.kind, transitionState.direction, Boolean(reducedMotion));
  const immersivePage = ['camera', 'analysis', 'result'].includes(currentPage);
  const activeRootTab = getRootTab(currentPage);
  const activeRootTabIndex = primaryTabs.indexOf(activeRootTab);
  const overlayPageVisible = !isTabPage(currentPage);
  const shellClassName = cn(
    'relative mx-auto h-screen max-w-md overflow-hidden font-sans shadow-[0_24px_80px_rgba(15,23,42,0.18)]',
    immersivePage
      ? 'bg-slate-950 text-white'
      : 'bg-[radial-gradient(circle_at_top,#eff6ff_0%,#ffffff_36%,#f8fafc_100%)]'
  );

  const renderPrimaryTab = (page: Page) => {
    if (page === 'home') {
      return <Home onNavigate={setCurrentPage} />;
    }
    if (page === 'records') {
      return (
        <RecordsPage
          records={records}
          onSelect={(r) => {
            setSelectedRecord(r);
            setCurrentPage('record_detail');
          }}
          onNavigate={setCurrentPage}
        />
      );
    }
    if (page === 'community') {
      return <CommunityFeed onNavigate={setCurrentPage} />;
    }
    return <ProfilePage onNavigate={setCurrentPage} />;
  };

  const renderOverlayPage = () => {
    if (currentPage === 'camera') {
      return (
        <CameraPage
          videoRef={videoRef}
          canvasRef={canvasRef}
          fileInputRef={fileInputRef}
          cameraReady={cameraReady}
          cameraError={cameraError}
          cameraLoading={cameraLoading}
          startCamera={startCamera}
          takePhoto={takePhoto}
          onNavigate={setCurrentPage}
          onFileSelect={handleFileSelect}
        />
      );
    }
    if (currentPage === 'analysis') {
      return <Analysis capturedImage={capturedImage} />;
    }
    if (currentPage === 'result') {
      return (
        <Result
          analysisResult={analysisResult}
          isSavingDiary={isSavingDiary}
          onSaveRecord={handleSaveRecord}
          onNavigate={setCurrentPage}
        />
      );
    }
    if (currentPage === 'record_detail') {
      return <RecordDetailPage record={selectedRecord} onBack={() => setCurrentPage('records')} />;
    }
    if (currentPage === 'diary') {
      return <DiaryEntry onNavigate={setCurrentPage} />;
    }
    if (currentPage === 'history') {
      return <History onNavigate={setCurrentPage} />;
    }
    if (currentPage === 'consultations') {
      return <PlaceholderPage title="我的咨询" icon={<MessageSquare size={48} />} onBack={() => setCurrentPage('profile')} />;
    }
    if (currentPage === 'appointments') {
      return <PlaceholderPage title="专家预约" icon={<Calendar size={48} />} onBack={() => setCurrentPage('profile')} />;
    }
    if (currentPage === 'settings') {
      return <PlaceholderPage title="设置" icon={<Settings size={48} />} onBack={() => setCurrentPage('profile')} />;
    }
    if (currentPage === 'about') {
      return <PlaceholderPage title="关于应用" icon={<Info size={48} />} onBack={() => setCurrentPage('profile')} />;
    }
    if (currentPage === 'community_post_detail') {
      return <PostDetail onNavigate={setCurrentPage} />;
    }
    if (currentPage === 'community_expert') {
      return <ExpertColumn onNavigate={setCurrentPage} />;
    }
    return <CreatePost onNavigate={setCurrentPage} />;
  };

  return (
    <div className="min-h-screen bg-slate-100 px-0 sm:px-6">
      <div className={shellClassName}>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_68%)]"
          animate={immersivePage ? { opacity: 0.12, scale: 1.05 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-16 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl"
          animate={immersivePage ? { x: 12, opacity: 0.25 } : { x: 0, opacity: 0.8 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        {primaryTabs.map((page, index) => (
          <motion.div
            key={page}
            initial={false}
            animate={{
              x: `${(index - activeRootTabIndex) * 100}%`,
              opacity: 1,
            }}
            transition={{ duration: page === activeRootTab || page === getRootTab(currentPage) ? 0.6 : 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute inset-0 min-h-screen transform-gpu will-change-transform',
              activeRootTab === page && !overlayPageVisible ? 'pointer-events-auto z-10' : 'pointer-events-none z-0'
            )}
          >
            {renderPrimaryTab(page)}
          </motion.div>
        ))}
        <AnimatePresence mode={pagePresenceMode}>
          {overlayPageVisible && (
            <motion.div
              key={currentPage}
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
              className="absolute inset-0 z-20 min-h-screen transform-gpu will-change-transform"
            >
              {renderOverlayPage()}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isTabPage(currentPage) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
            >
              <BottomNav activePage={currentPage} onNavigate={setCurrentPage} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
