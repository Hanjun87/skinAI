/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Home from './pages/Home';
import CameraPage from './pages/Home/Camera';
import Analysis from './pages/Home/Analysis';
import Result from './pages/Home/Result';
import RecordsPage from './pages/Records';
import RecordDetailPage from './pages/Records/RecordDetail';

import ProfilePage from './pages/Profile';
import PlaceholderPage from './pages/Profile/PlaceholderPage';
import { CommunityFeed } from './pages/Community/CommunityFeed';
import { PostDetail } from './pages/Community/PostDetail';
import { ExpertColumn } from './pages/Community/ExpertColumn';
import { CreatePost } from './pages/Community/CreatePost';
import { Page, Record, AnalysisResult } from './types';
import { BottomNav } from './components/common/BottomNav';

// --- Main App ---

export default function App() {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const buildApiUrl = (path: string) => `${apiBaseUrl}${path}`;
  const [currentPage, _setCurrentPage] = useState<Page>('home');
  const [direction, setDirection] = useState(0); // 1: forward/right, -1: back/left

  const setCurrentPage = (page: Page) => {
    const levels: { [key in Page]: number } = {
      home: 0, records: 0, community: 0, profile: 0,
      camera: 1, analysis: 1, result: 1, record_detail: 1,
      consultations: 1, appointments: 1, settings: 1, about: 1,
      community_post_detail: 1, community_expert: 1, community_create: 1
    };
    const tabs: Page[] = ['home', 'records', 'community', 'profile'];

    const fromLevel = levels[currentPage];
    const toLevel = levels[page];

    if (toLevel > fromLevel) {
      setDirection(1); // Slide in from right
    } else if (toLevel < fromLevel) {
      setDirection(-1); // Slide in from left
    } else if (toLevel === 0 && fromLevel === 0) {
      const fromIdx = tabs.indexOf(currentPage);
      const toIdx = tabs.indexOf(page);
      setDirection(toIdx > fromIdx ? 1 : -1);
    } else {
      setDirection(0);
    }

    _setCurrentPage(page);
  };

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);



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
    const newRecord: Record = {
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

  const pageVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 30 : direction < 0 ? -30 : 0,
      scale: direction === 0 ? 0.98 : 1
    }),
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? -30 : direction < 0 ? 30 : 0,
      scale: direction === 0 ? 0.98 : 1,
      transition: { duration: 0.25, ease: "easeInOut" }
    })
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-white shadow-2xl relative overflow-hidden font-sans">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPage}
          custom={direction}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          className="h-full"
        >
          {currentPage === 'home' && <Home onNavigate={setCurrentPage} />}
          {currentPage === 'camera' && (
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
          )}
          {currentPage === 'analysis' && <Analysis capturedImage={capturedImage} />}
          {currentPage === 'result' && (
            <Result
              analysisResult={analysisResult}
              isSavingDiary={isSavingDiary}
              onSaveRecord={handleSaveRecord}
              onNavigate={setCurrentPage}
            />
          )}
          {currentPage === 'records' && (
            <RecordsPage
              records={records}
              onSelect={(r) => {
                setSelectedRecord(r);
                setCurrentPage('record_detail');
              }}
            />
          )}
          {currentPage === 'record_detail' && (
            <RecordDetailPage record={selectedRecord} onBack={() => setCurrentPage('records')} />
          )}

          {currentPage === 'profile' && <ProfilePage onNavigate={setCurrentPage} />}
          {currentPage === 'consultations' && (
            <PlaceholderPage title="我的咨询" icon={<MessageSquare size={48} />} onBack={() => setCurrentPage('profile')} />
          )}
          {currentPage === 'appointments' && (
            <PlaceholderPage title="专家预约" icon={<Calendar size={48} />} onBack={() => setCurrentPage('profile')} />
          )}
          {currentPage === 'settings' && (
            <PlaceholderPage title="设置" icon={<Settings size={48} />} onBack={() => setCurrentPage('profile')} />
          )}
          {currentPage === 'about' && (
            <PlaceholderPage title="关于应用" icon={<Info size={48} />} onBack={() => setCurrentPage('profile')} />
          )}
          {currentPage === 'community' && <CommunityFeed onNavigate={setCurrentPage} />}
          {currentPage === 'community_post_detail' && <PostDetail onNavigate={setCurrentPage} />}
          {currentPage === 'community_expert' && <ExpertColumn onNavigate={setCurrentPage} />}
          {currentPage === 'community_create' && <CreatePost onNavigate={setCurrentPage} />}
        </motion.div>
      </AnimatePresence>

      {['home', 'records', 'profile', 'community'].includes(currentPage) && (
        <BottomNav activePage={currentPage} onNavigate={setCurrentPage} />
      )}
    </div>
  );
}
