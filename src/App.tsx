/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  History,
  BookOpen,
  User,
  Search,
  Settings,
  ChevronRight,
  Info,
  MessageSquare,
  Calendar,
  FileText,
  ArrowLeft,
  Flashlight,
  CheckCircle2,
  AlertCircle,
  Sun,
  Shield,
  Umbrella,
  Shirt,
  Glasses,
  Plus,
  Scan,
  Loader2,
  Droplets,
  Moon,
  Smile,
  Frown,
  Meh,
  Activity,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type Page = 'home' | 'camera' | 'analysis' | 'result' | 'records' | 'record_detail' | 'diary' | 'diary_detail' | 'profile' | 'consultations' | 'appointments' | 'settings' | 'about' | 'admin_ai';

interface Record {
  id: string;
  title: string;
  date: string;
  status: '恢复中' | '待复查' | '已结束';
  image: string;
  probability: number;
  description: string;
  precautions: string[];
  typicalImage: string;
}

interface AnalysisResult {
  diagnosis: string;
  probability: number;
  description: string;
  precautions: string[];
  typicalImage: string;
  userImage: string;
}

interface AdminAnalyzeResult {
  diagnosis: string;
  probability: number;
  description: string;
  precautions: string[];
}

// --- Components ---

const BottomNav = ({ activePage, onNavigate }: { activePage: Page, onNavigate: (p: Page) => void }) => {
  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: '识别', icon: <Camera size={24} /> },
    { id: 'records', label: '档案', icon: <FileText size={24} /> },
    { id: 'diary', label: '日记', icon: <BookOpen size={24} /> },
    { id: 'profile', label: '我的', icon: <User size={24} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-6 py-3 pb-8 flex justify-between items-center z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex flex-col items-center gap-1 transition-colors ${(activePage === item.id ||
            (item.id === 'profile' && ['consultations', 'appointments', 'settings', 'about', 'admin_ai'].includes(activePage)))
            ? 'text-blue-500' : 'text-gray-400'
            }`}
        >
          {item.icon}
          <span className="text-[10px] font-bold">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

// --- Main App ---

export default function App() {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const buildApiUrl = (path: string) => `${apiBaseUrl}${path}`;
  const [currentPage, _setCurrentPage] = useState<Page>('home');
  const [direction, setDirection] = useState(0); // 1: forward/right, -1: back/left

  const setCurrentPage = (page: Page) => {
    const levels: { [key in Page]: number } = {
      home: 0, records: 0, diary: 0, profile: 0,
      camera: 1, analysis: 1, result: 1, record_detail: 1, diary_detail: 1,
      consultations: 1, appointments: 1, settings: 1, about: 1, admin_ai: 1
    };
    const tabs: Page[] = ['home', 'records', 'diary', 'profile'];

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
  const [selectedDiaryRecord, setSelectedDiaryRecord] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Diary states
  const [uvLevel, setUvLevel] = useState(3);
  const [selectedProtections, setSelectedProtections] = useState<string[]>(['防晒霜']);
  const [skinTone, setSkinTone] = useState(30);
  const [skinFeeling, setSkinFeeling] = useState<string>('正常');
  const [waterIntake, setWaterIntake] = useState(4);
  const [sleepQuality, setSleepQuality] = useState<string>('良好');
  const [isSavingDiary, setIsSavingDiary] = useState(false);
  const [isAddingDiary, setIsAddingDiary] = useState(false);

  const [diaryRecords, setDiaryRecords] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adminTestFileInputRef = useRef<HTMLInputElement>(null);
  const [adminProviders, setAdminProviders] = useState<string[]>([]);
  const [adminProvider, setAdminProvider] = useState('local_model');
  const [adminEndpoint, setAdminEndpoint] = useState('');
  const [adminModel, setAdminModel] = useState('');
  const [adminApiKey, setAdminApiKey] = useState('');
  const [adminTimeoutMs, setAdminTimeoutMs] = useState('20000');
  const [adminApiKeyMasked, setAdminApiKeyMasked] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminTestImage, setAdminTestImage] = useState<string | null>(null);
  const [adminTesting, setAdminTesting] = useState(false);
  const [adminTestResult, setAdminTestResult] = useState<AdminAnalyzeResult | null>(null);

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
        throw new Error('识别服务不可用');
      }
      const data = await response.json();

      setAnalysisResult({
        diagnosis: data.diagnosis,
        probability: data.probability,
        description: data.description,
        precautions: data.precautions,
        userImage: base64Image,
        typicalImage: base64Image
      });
      setCurrentPage('result');
    } catch (error) {
      console.error("Analysis failed:", error);
      setCurrentPage('home');
      window.alert('识别失败，请稍后重试');
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
      description: analysisResult.description,
      precautions: analysisResult.precautions,
      typicalImage: analysisResult.typicalImage
    };
    setRecords(prev => [newRecord, ...prev]);
    setTimeout(() => {
      setIsSavingDiary(false);
      setCurrentPage('records');
    }, 600);
  };

  const loadAdminConfig = async () => {
    setAdminLoading(true);
    setAdminMessage('');
    try {
      const [providersResp, configResp] = await Promise.all([
        fetch(buildApiUrl('/api/admin/ai/providers')),
        fetch(buildApiUrl('/api/admin/ai/config'))
      ]);
      if (!providersResp.ok || !configResp.ok) {
        throw new Error('后台配置读取失败');
      }
      const providersData = await providersResp.json();
      const configData = await configResp.json();
      setAdminProviders(Array.isArray(providersData.providers) ? providersData.providers : []);
      setAdminProvider(configData.provider || 'local_model');
      setAdminEndpoint(configData.external?.endpoint || '');
      setAdminModel(configData.external?.model || '');
      setAdminTimeoutMs(String(configData.external?.timeoutMs || 20000));
      setAdminApiKeyMasked(configData.external?.apiKeyMasked || '');
      setAdminApiKey('');
    } catch (error) {
      console.error(error);
      setAdminMessage('读取配置失败');
    } finally {
      setAdminLoading(false);
    }
  };

  const saveAdminConfig = async () => {
    setAdminSaving(true);
    setAdminMessage('');
    try {
      const response = await fetch(buildApiUrl('/api/admin/ai/config'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: adminProvider,
          external: {
            endpoint: adminEndpoint,
            model: adminModel,
            timeoutMs: Number(adminTimeoutMs),
            ...(adminApiKey ? { apiKey: adminApiKey } : {})
          }
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '保存失败');
      }
      setAdminApiKeyMasked(data.external?.apiKeyMasked || '');
      setAdminApiKey('');
      setAdminMessage('配置已保存');
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminTestFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAdminTestImage(dataUrl);
      setAdminTestResult(null);
    };
    reader.readAsDataURL(file);
  };

  const runAdminAnalyze = async () => {
    if (!adminTestImage) {
      setAdminMessage('请先上传测试图片');
      return;
    }
    setAdminTesting(true);
    setAdminMessage('');
    try {
      const response = await fetch(buildApiUrl('/api/admin/ai/analyze'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: adminTestImage,
          provider: adminProvider
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '测试识别失败');
      }
      setAdminTestResult({
        diagnosis: data.diagnosis,
        probability: data.probability,
        description: data.description,
        precautions: data.precautions
      });
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : '测试识别失败');
    } finally {
      setAdminTesting(false);
    }
  };

  // --- Camera Logic ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const takePhoto = () => {
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
    }
    return () => stopCamera();
  }, [currentPage]);

  useEffect(() => {
    if (currentPage === 'admin_ai') {
      loadAdminConfig();
    }
  }, [currentPage]);

  // --- Render Helpers ---

  const renderHome = () => (
    <div className="flex flex-col h-full">
      <header className="pt-12 px-6 pb-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-gray-900">您好, 访客</h1>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
            <User size={24} />
          </div>
        </div>
        <p className="text-gray-500 text-sm">关注您的皮肤健康</p>
      </header>


      <main className="flex-grow flex flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-12">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-blue-500 rounded-full opacity-20"
          />
          <button
            onClick={() => setCurrentPage('camera')}
            className="relative z-10 w-48 h-48 bg-blue-500 rounded-full flex flex-col items-center justify-center shadow-2xl shadow-blue-300 active:scale-95 transition-transform"
          >
            <Camera size={64} className="text-white mb-2" />
            <span className="text-white text-lg font-bold">拍照识别</span>
          </button>
        </div>

        <div className="mt-8 text-xs text-gray-400">
          AI 技术仅供参考，如有不适请及时就医
        </div>
      </main>
    </div>
  );

  const renderCamera = () => (
    <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-black z-50 flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={() => setCurrentPage('home')} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
          <ArrowLeft size={24} />
        </button>
        <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
          <Flashlight size={24} />
        </button>
      </div>

      <div className="flex-grow relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-72 border-2 border-blue-500/50 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
            <motion.div
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 pb-12 rounded-t-[40px] flex flex-col items-center">
        <p className="text-gray-500 text-sm mb-8">请将镜头对准，并保持光线充足</p>
        <div className="flex items-center justify-between w-full max-w-xs">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
              <ImageIcon size={24} />
            </div>
            <span className="text-[10px] text-gray-400">相册</span>
          </button>

          <button
            onClick={takePhoto}
            className="w-20 h-20 rounded-full border-4 border-blue-100 p-1 active:scale-90 transition-transform"
          >
            <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Camera size={32} />
            </div>
          </button>

          <div className="w-12" /> {/* Spacer to keep camera centered */}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
    </div>
  );

  const renderAnalysis = () => (
    <div className="flex flex-col h-full bg-white p-6 justify-center items-center text-center">
      <div className="w-full max-w-sm aspect-square rounded-3xl overflow-hidden mb-12 relative shadow-2xl">
        {capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 border-4 border-blue-500/30 rounded-3xl" />
        <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-500" />
        <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-500" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-500" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-500" />
        <motion.div
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute left-0 right-0 h-1 bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.8)]"
        />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <h2 className="text-xl font-bold text-gray-900">AI 正在深度分析中...</h2>
      </div>
      <p className="text-gray-400 text-sm mb-8">正在识别皮损特征、颜色分布及边缘轮廓，请稍候</p>

      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5 }}
          className="h-full bg-blue-500"
        />
      </div>

      <div className="mt-24 p-4 bg-blue-50 rounded-2xl flex items-start gap-4 text-left">
        <AlertCircle size={20} className="text-blue-500 shrink-0" />
        <div>
          <h4 className="font-bold text-blue-900 text-sm mb-1">医疗免责声明</h4>
          <p className="text-blue-700 text-[10px] leading-relaxed">
            AI分析结果仅供参考，不作为最终医疗诊断。如果症状严重或持续，请咨询专业皮肤科医生。
          </p>
        </div>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-32">
      <header className="p-6 flex items-center justify-between bg-white sticky top-0 z-10">
        <button onClick={() => setCurrentPage('home')} className="text-gray-400">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-gray-900">识别结果报告</h2>
        <div className="w-6" />
      </header>

      <div className="p-6 text-center">
        <p className="text-gray-400 text-sm mb-2">匹配结果可能是</p>
        <h1 className="text-3xl font-black text-blue-600 mb-4">{analysisResult?.diagnosis}</h1>
        <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
          <span className="text-blue-600 font-bold">{analysisResult?.probability}%</span>
          <span className="text-blue-400 text-xs">可能性</span>
        </div>
      </div>

      <div className="px-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <h3 className="font-bold text-gray-900">症状简述</h3>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            {analysisResult?.description}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <h3 className="font-bold text-gray-900">对比图</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-center">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <img src={analysisResult?.userImage} alt="User" className="w-full h-full object-cover" />
              </div>
              <p className="text-[10px] text-gray-400">您的照片</p>
            </div>
            <div className="space-y-2 text-center">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <img src={analysisResult?.typicalImage} alt="Typical" className="w-full h-full object-cover" />
              </div>
              <p className="text-[10px] text-gray-400">典型病例</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <h3 className="font-bold text-gray-900">AI 建议</h3>
          </div>
          <ul className="space-y-4">
            {analysisResult?.precautions.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span className="text-gray-500 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-[10px] text-gray-300 px-8">
          *本报告仅供参考，不作为最终诊断依据。皮肤病种类复杂，如有不适请务必寻求专业医师诊治。
        </p>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white border-t border-gray-100 flex gap-4 z-20">
        <button
          onClick={handleSaveRecord}
          className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {isSavingDiary ? <Loader2 className="animate-spin" size={20} /> : '保存记录'}
        </button>
        <button
          onClick={() => setCurrentPage('consultations')}
          className="flex-1 py-4 bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          咨询医生
        </button>
      </div>
    </div>
  );

  const renderRecords = () => (
    <div className="flex flex-col h-full bg-gray-50 pb-24">
      <header className="p-6 flex items-center justify-center bg-white sticky top-0 z-10 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">健康档案</h2>
        <button className="absolute right-6 text-gray-400"><Search size={24} /></button>
      </header>

      <div className="p-4">
        {records.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 py-16 px-8 text-center">
            <p className="text-gray-500 font-bold mb-2">暂无识别记录</p>
            <p className="text-xs text-gray-400">完成一次拍照识别并保存后，会在这里显示</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(record => (
              <button
                key={record.id}
                onClick={() => {
                  setSelectedRecord(record);
                  setCurrentPage('record_detail');
                }}
                className="w-full bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 active:bg-gray-50 transition-colors cursor-pointer text-left"
              >
                <img src={record.image} alt={record.title} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-900">{record.title}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-500">
                      {record.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-2">{record.date}</p>
                  <div className="text-blue-500 text-[10px] font-bold flex items-center gap-1">
                    <Scan size={12} /> 查看报告
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-200" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderRecordDetail = () => (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-32">
      <header className="p-6 flex items-center justify-between bg-white sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => setCurrentPage('records')} className="text-gray-400 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-gray-900">档案详情</h2>
        <div className="w-6" />
      </header>

      <div className="p-8 text-center bg-white mb-4">
        <div className="inline-block p-2 bg-blue-50 rounded-2xl mb-4">
          <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center text-white">
            <Scan size={32} />
          </div>
        </div>
        <p className="text-gray-400 text-xs mb-1 uppercase tracking-widest font-bold">Health Record ID: {selectedRecord?.id}008273</p>
        <h1 className="text-3xl font-black text-gray-900 mb-2">{selectedRecord?.title}</h1>
        <div className="flex justify-center items-center gap-3">
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${selectedRecord?.status === '恢复中' ? 'bg-emerald-100 text-emerald-600' :
            selectedRecord?.status === '待复查' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
            }`}>
            {selectedRecord?.status}
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-xs text-gray-400 font-medium">{selectedRecord?.date}</span>
        </div>
      </div>

      <div className="px-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-blue-500 rounded-full" />
              <h3 className="font-bold text-gray-900">诊断分析</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Confidence</p>
              <p className="text-lg font-black text-blue-500">{selectedRecord?.probability}%</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            {selectedRecord?.description}
          </p>
          <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-[10px] text-gray-400 font-bold mb-2 uppercase">AI Analysis Summary</p>
            <p className="text-xs text-gray-500 italic">根据影像特征分析，该症状与{selectedRecord?.title}的典型临床表现高度吻合，建议持续观察并按时复诊。</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <h3 className="font-bold text-gray-900">影像资料对比</h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                <img src={selectedRecord?.image} alt="User" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-900">记录照片</p>
                <p className="text-[10px] text-gray-400">Captured Image</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                <img src={selectedRecord?.typicalImage} alt="Typical" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-900">典型病例</p>
                <p className="text-[10px] text-gray-400">Clinical Case</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <h3 className="font-bold text-gray-900">AI 建议</h3>
          </div>
          <div className="space-y-4">
            {selectedRecord?.precautions.map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {i + 1}
                </div>
                <span className="text-gray-700 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center text-center opacity-60">
          <AlertCircle size={32} className="text-gray-300 mb-2" />
          <p className="text-[10px] text-gray-400 leading-relaxed">
            本报告由 SkinAI 智能分析系统生成，仅供健康参考。若症状持续或加重，请立即前往正规医院皮肤科就诊。
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-lg border-t border-gray-100 flex gap-4 z-20">
        <button
          onClick={() => {
            setIsSavingDiary(true);
            setTimeout(() => {
              setIsSavingDiary(false);
              setCurrentPage('records');
            }, 1000);
          }}
          className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {isSavingDiary ? <Loader2 className="animate-spin" size={20} /> : '保存记录'}
        </button>
        <button
          onClick={() => setCurrentPage('consultations')}
          className="flex-1 py-4 bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          咨询医生
        </button>
      </div>
    </div>
  );

  const renderDiary = () => {
    const getUvText = (level: number) => {
      if (level <= 2) return '弱';
      if (level <= 5) return '中等';
      if (level <= 7) return '强';
      return '极强';
    };

    const toggleProtection = (name: string) => {
      setSelectedProtections(prev =>
        prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
      );
    };

    const handleSaveDiary = () => {
      setIsSavingDiary(true);
      setTimeout(() => {
        const newRecord = {
          id: Date.now(),
          date: new Date().toISOString().split('T')[0],
          uv: uvLevel,
          water: waterIntake,
          sleep: sleepQuality,
          mood: '平静',
          skin: skinFeeling
        };
        setDiaryRecords([newRecord, ...diaryRecords]);
        setIsSavingDiary(false);
        setIsAddingDiary(false);
      }, 1500);
    };

    const getUvColor = (level: number) => {
      if (level <= 3) return '#fbbf24'; // orange-400
      if (level <= 6) return '#f97316'; // orange-500
      return '#ef4444'; // red-500
    };

    const uvColorHex = getUvColor(uvLevel);
    const uvTextClass = uvLevel > 6 ? 'text-red-500' : 'text-orange-400';
    const weeklyRecords = diaryRecords.slice(0, 7);
    const averageWater = weeklyRecords.length > 0
      ? (weeklyRecords.reduce((sum, record) => sum + Number(record.water || 0), 0) / weeklyRecords.length).toFixed(1)
      : '--';
    const averageUv = weeklyRecords.length > 0
      ? (weeklyRecords.reduce((sum, record) => sum + Number(record.uv || 0), 0) / weeklyRecords.length).toFixed(1)
      : '--';

    // Calculate completion percentage
    const completionPercentage = [
      uvLevel > 0,
      selectedProtections.length > 0,
      skinFeeling !== '',
      skinTone > 0,
      waterIntake > 0,
      sleepQuality !== ''
    ].filter(Boolean).length / 6 * 100;

    return (
      <AnimatePresence mode="wait">
        {!isAddingDiary ? (
          <motion.div
            key="diary-list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col h-full bg-gray-50 pb-24 overflow-y-auto"
          >
            <header className="pt-12 px-6 pb-6 bg-white shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-500 font-bold text-sm tracking-wider uppercase mb-1">Skin Diary</p>
                  <h1 className="text-2xl font-bold text-gray-900">皮肤健康日记</h1>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAddingDiary(true)}
                  className="w-12 h-12 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center"
                >
                  <Plus size={24} />
                </motion.button>
              </div>
            </header>

            <div className="px-6 space-y-8 mt-6">
              {/* Statistics Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={20} className="text-indigo-500" />
                  <h2 className="font-bold text-gray-700">本周统计</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                        <Droplets size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-400">平均饮水</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-gray-900">{averageWater}</span>
                      <span className="text-xs font-bold text-gray-400">杯/日</span>
                    </div>
                    <div className="mt-3 text-[10px] font-bold text-gray-400">
                      <span>{weeklyRecords.length > 0 ? `基于最近 ${weeklyRecords.length} 条记录` : '暂无数据'}</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                        <Sun size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-400">UV 暴露</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-gray-900">{averageUv}</span>
                      <span className="text-xs font-bold text-gray-400">指数</span>
                    </div>
                    <div className="mt-3 text-[10px] font-bold text-gray-400">
                      <span>{weeklyRecords.length > 0 ? `基于最近 ${weeklyRecords.length} 条记录` : '暂无数据'}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={20} className="text-violet-500" />
                  <h2 className="font-bold text-gray-700">健康周报</h2>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-dashed border-violet-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900">周报功能开发中</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-500">敬请期待</span>
                  </div>
                  <p className="text-xs text-gray-400">后续将在日记页查看本周趋势、异常提醒和护理建议。</p>
                </div>
              </section>

              {/* Recent Records List */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History size={20} className="text-gray-400" />
                    <h2 className="font-bold text-gray-700">最近记录</h2>
                  </div>
                  <button className="text-xs font-bold text-blue-500">查看全部</button>
                </div>
                <div className="space-y-4">
                  {diaryRecords.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => {
                        setSelectedDiaryRecord(record);
                        setCurrentPage('diary_detail');
                      }}
                      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${record.skin === '正常' ? 'bg-emerald-50 text-emerald-500' : 'bg-orange-50 text-orange-500'
                          }`}>
                          {record.skin === '正常' ? <Smile size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{record.date}</h3>
                          <p className="text-xs text-gray-400 font-medium">皮肤状态: {record.skin}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-gray-300 uppercase">UV</span>
                          <span className="text-sm font-black text-gray-700">{record.uv}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-gray-300 uppercase">H2O</span>
                          <span className="text-sm font-black text-gray-700">{record.water}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="diary-add"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col h-full bg-gray-50 pb-24 overflow-y-auto"
          >
            <header className="pt-12 px-6 pb-6 bg-white shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setIsAddingDiary(false)}
                  className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 active:scale-95"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <p className="text-blue-500 font-bold text-sm tracking-wider uppercase mb-1">New Entry</p>
                  <h1 className="text-2xl font-bold text-gray-900">记录今日状态</h1>
                </div>
              </div>

              {/* Diary Completion Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <span>填写进度</span>
                  <span>{Math.round(completionPercentage)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                  />
                </div>
              </div>
            </header>

            <div className="px-6 space-y-8 mt-6">
              {/* UV Intensity */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Sun size={20} className={uvTextClass} />
                  <h2 className="font-bold text-gray-700">今日阳光强度</h2>
                </div>
                <div className="bg-white rounded-3xl p-8 border border-gray-100 flex flex-col items-center shadow-sm relative overflow-hidden">
                  {/* Background Decorative Gradient */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />

                  <div className="relative w-56 h-56 flex items-center justify-center">
                    {/* SVG Circular Progress Bar */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="112"
                        cy="112"
                        r="100"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-gray-50"
                      />
                      <motion.circle
                        cx="112"
                        cy="112"
                        r="100"
                        stroke="url(#uvGradient)"
                        strokeWidth="12"
                        strokeDasharray="628"
                        initial={{ strokeDashoffset: 628 }}
                        animate={{ strokeDashoffset: 628 - (628 * uvLevel / 10) }}
                        strokeLinecap="round"
                        fill="transparent"
                        transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                      />
                      <defs>
                        <linearGradient id="uvGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                      >
                        <Sun size={48} className={uvTextClass + ' mb-1'} />
                      </motion.div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">UV Index</span>
                      <span className="text-3xl font-black text-gray-900">{getUvText(uvLevel)}</span>
                      <span className="text-[10px] font-bold text-gray-400 mt-1">{uvLevel}/10</span>
                    </div>
                  </div>

                  {/* Linear Progress Bar for UV */}
                  <div className="w-full mt-10 space-y-3">
                    <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden p-0.5 border border-gray-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${uvLevel * 10}%` }}
                        transition={{ type: 'spring', stiffness: 50 }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={uvLevel}
                      onChange={(e) => setUvLevel(parseInt(e.target.value))}
                      className="w-full opacity-0 absolute h-3 cursor-pointer z-10"
                    />
                    <div className="w-full flex justify-between px-1 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                      <span className={uvLevel <= 2 ? 'text-yellow-500' : ''}>弱</span>
                      <span className={uvLevel > 2 && uvLevel <= 5 ? 'text-orange-500' : ''}>中</span>
                      <span className={uvLevel > 5 && uvLevel <= 8 ? 'text-red-500' : ''}>强</span>
                      <span className={uvLevel > 8 ? 'text-red-700' : ''}>极强</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Protection Measures */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={20} className="text-blue-500" />
                  <h2 className="font-bold text-gray-700">防晒措施</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: '防晒霜', icon: Loader2 },
                    { name: '遮阳伞', icon: Umbrella },
                    { name: '防晒衣/帽', icon: Shirt },
                    { name: '墨镜', icon: Glasses }
                  ].map((item) => {
                    const isActive = selectedProtections.includes(item.name);
                    return (
                      <button
                        key={item.name}
                        onClick={() => toggleProtection(item.name)}
                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 border-2 ${isActive
                          ? 'bg-blue-50 border-blue-500 shadow-md shadow-blue-100'
                          : 'bg-white border-gray-100 hover:border-blue-200'
                          }`}
                      >
                        <item.icon size={32} className={isActive ? 'text-blue-500' : 'text-gray-300'} />
                        <span className={`text-xs font-bold ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Skin Feeling */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={20} className="text-emerald-500" />
                  <h2 className="font-bold text-gray-700">皮肤感受</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {['正常', '干燥', '油腻', '瘙痒', '泛红', '紧绷'].map((feeling) => (
                    <button
                      key={feeling}
                      onClick={() => setSkinFeeling(feeling)}
                      className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${skinFeeling === feeling
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                        : 'bg-white text-gray-400 border border-gray-100'
                        }`}
                    >
                      {feeling}
                    </button>
                  ))}
                </div>
              </section>

              {/* Skin Tone */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <User size={20} className="text-amber-600" />
                  <div className="flex items-center justify-between w-full">
                    <h2 className="font-bold text-gray-700">今日皮肤颜色</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-amber-600/40 uppercase tracking-tighter">Tone Index: {skinTone}</span>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                        {skinTone < 20 ? '非常白皙' : skinTone < 40 ? '白皙' : skinTone < 60 ? '自然' : skinTone < 80 ? '小麦色' : '深褐色'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <div className="h-24 w-full rounded-2xl bg-gray-50 relative overflow-hidden shadow-inner border border-gray-100">
                    {/* Background Full Gradient (Dimmed) */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFDBAC] via-[#E0AC69] to-[#8D5524] opacity-20" />

                    {/* Active Gradient Progress */}
                    <motion.div
                      className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#FFDBAC] via-[#E0AC69] to-[#8D5524] z-0"
                      initial={{ width: 0 }}
                      animate={{ width: `${skinTone}%` }}
                      transition={{ type: 'spring', damping: 20 }}
                      style={{ backgroundSize: '100% 100%' }}
                    />

                    {/* Visual Indicator */}
                    <motion.div
                      className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_15px_rgba(0,0,0,0.4)] z-10 pointer-events-none"
                      animate={{ left: `${skinTone}%` }}
                      transition={{ type: 'spring', damping: 20 }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full border-4 border-amber-600 shadow-xl flex items-center justify-center">
                        <div className="w-2 h-2 bg-amber-600 rounded-full" />
                      </div>
                    </motion.div>

                    {/* The actual slider - invisible but covers the whole area */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skinTone}
                      onChange={(e) => setSkinTone(parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                    />

                    {/* Subtle markers */}
                    <div className="absolute inset-0 flex justify-between px-6 items-center opacity-10 pointer-events-none z-20">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="w-px h-8 bg-black" />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#FFDBAC] border-2 border-white shadow-sm" />
                      <span>Fair</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Deep</span>
                      <div className="w-5 h-5 rounded-full bg-[#8D5524] border-2 border-white shadow-sm" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Water Intake */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Droplets size={20} className="text-blue-400" />
                  <h2 className="font-bold text-gray-700">饮水量 (杯)</h2>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                        <button
                          key={num}
                          onClick={() => setWaterIntake(num)}
                          className={`w-8 h-10 rounded-lg flex items-center justify-center transition-all ${waterIntake >= num ? 'bg-blue-500 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-300'
                            }`}
                        >
                          <Droplets size={16} />
                        </button>
                      ))}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-blue-500">{waterIntake}</span>
                      <span className="text-xs font-bold text-gray-300 ml-1">/ 8</span>
                    </div>
                  </div>

                  {/* Gradient Progress Bar for Water */}
                  <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden p-0.5 border border-gray-100">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${(waterIntake / 8) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 50 }}
                    />
                  </div>
                </div>
              </section>

              {/* Sleep Quality */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Moon size={20} className="text-indigo-400" />
                  <h2 className="font-bold text-gray-700">睡眠质量</h2>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { name: '糟糕', icon: Frown, color: 'text-red-400', bg: 'bg-red-50', value: 33 },
                      { name: '一般', icon: Meh, color: 'text-orange-400', bg: 'bg-orange-50', value: 66 },
                      { name: '良好', icon: Smile, color: 'text-emerald-400', bg: 'bg-emerald-50', value: 100 }
                    ].map((item) => (
                      <button
                        key={item.name}
                        onClick={() => setSleepQuality(item.name)}
                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${sleepQuality === item.name
                          ? `${item.bg} border-current ${item.color} shadow-lg`
                          : 'bg-white border-gray-100 text-gray-300'
                          }`}
                      >
                        <item.icon size={32} />
                        <span className="text-xs font-bold">{item.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Gradient Progress Bar for Sleep */}
                  {sleepQuality && (
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${sleepQuality === '糟糕' ? 'from-red-400 to-red-600' :
                            sleepQuality === '一般' ? 'from-orange-400 to-orange-600' :
                              'from-emerald-400 to-emerald-600'
                            }`}
                          initial={{ width: 0 }}
                          animate={{
                            width: sleepQuality === '糟糕' ? '33%' : sleepQuality === '一般' ? '66%' : '100%'
                          }}
                          transition={{ type: 'spring', stiffness: 50 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <button
                onClick={handleSaveDiary}
                disabled={isSavingDiary}
                className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${isSavingDiary
                  ? 'bg-emerald-500 text-white shadow-emerald-200'
                  : 'bg-blue-500 text-white shadow-blue-200 active:scale-95'
                  }`}
              >
                {isSavingDiary ? (
                  <>
                    <CheckCircle2 size={20} />
                    <span>保存成功</span>
                  </>
                ) : (
                  <span>保存今日记录</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderDiaryDetail = () => {
    if (!selectedDiaryRecord) return null;

    return (
      <div className="flex flex-col h-full bg-gray-50 pb-24 overflow-y-auto">
        <header className="pt-12 px-6 pb-6 bg-white shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setCurrentPage('diary')}
              className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-blue-500 font-bold text-sm tracking-wider uppercase mb-1">Diary Detail</p>
              <h1 className="text-2xl font-bold text-gray-900">{selectedDiaryRecord.date}</h1>
            </div>
          </div>
        </header>

        <div className="px-6 space-y-6 mt-6">
          {/* Skin Status Card */}
          <div className={`p-6 rounded-3xl border shadow-sm flex items-center gap-4 ${selectedDiaryRecord.skin === '正常' ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'
            }`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedDiaryRecord.skin === '正常' ? 'bg-white text-emerald-500' : 'bg-white text-orange-500'
              }`}>
              {selectedDiaryRecord.skin === '正常' ? <Smile size={32} /> : <AlertCircle size={32} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">皮肤状态: {selectedDiaryRecord.skin}</h3>
              <p className="text-sm text-gray-500">记录于 {selectedDiaryRecord.date}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <Sun size={20} />
                </div>
                <span className="text-xs font-bold text-gray-400">UV 强度</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-gray-900">{selectedDiaryRecord.uv}</span>
                <span className="text-xs font-bold text-gray-400">指数</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <Droplets size={20} />
                </div>
                <span className="text-xs font-bold text-gray-400">饮水量</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-gray-900">{selectedDiaryRecord.water}</span>
                <span className="text-xs font-bold text-gray-400">杯</span>
              </div>
            </div>
          </div>

          {/* Other Details */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Moon size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">睡眠质量</p>
                  <p className="font-bold text-gray-900">{selectedDiaryRecord.sleep || '良好'}</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-gray-50" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">心情指数</p>
                  <p className="font-bold text-gray-900">{selectedDiaryRecord.mood || '平静'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPlaceholderPage = (title: string, icon: React.ReactNode) => (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="p-6 flex items-center justify-between bg-white sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => setCurrentPage('profile')} className="text-gray-400 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <div className="w-6" />
      </header>
      <div className="flex-grow flex flex-col items-center justify-center p-12 text-center">
        <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500 mb-6">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}功能开发中</h3>
        <p className="text-gray-400 text-sm">我们正在努力为您带来更好的体验，敬请期待！</p>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="flex flex-col h-full bg-gray-50 pb-24 overflow-y-auto">
      <header className="p-6 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="w-6" />
        <h2 className="text-lg font-bold text-gray-900">个人中心</h2>
        <button onClick={() => setCurrentPage('settings')} className="text-gray-400"><Settings size={24} /></button>
      </header>

      <div className="p-6">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-sm overflow-hidden bg-orange-100">
            <img src="https://picsum.photos/seed/avatar/200/200" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">健康守护者</h1>
            <p className="text-gray-400 text-sm mt-1">ID: 88472910</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Scan size={18} />
              <span className="text-xs font-bold">识别次数</span>
            </div>
            <p className="text-3xl font-black text-gray-900">12 <span className="text-sm font-normal text-gray-400">次</span></p>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Calendar size={18} />
              <span className="text-xs font-bold">记录天数</span>
            </div>
            <p className="text-3xl font-black text-gray-900">45 <span className="text-sm font-normal text-gray-400">天</span></p>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">常用功能</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setCurrentPage('consultations')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <MessageSquare size={20} />
                  </div>
                  <span className="font-bold text-gray-700">我的咨询</span>
                </div>
                <ChevronRight size={20} className="text-gray-200" />
              </button>
              <div className="h-px bg-gray-50 mx-4" />
              <button
                onClick={() => setCurrentPage('appointments')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Calendar size={20} />
                  </div>
                  <span className="font-bold text-gray-700">专家预约</span>
                </div>
                <ChevronRight size={20} className="text-gray-200" />
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">系统服务</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setCurrentPage('admin_ai')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Shield size={20} />
                  </div>
                  <span className="font-bold text-gray-700">AI后台管理</span>
                </div>
                <ChevronRight size={20} className="text-gray-200" />
              </button>
              <div className="h-px bg-gray-50 mx-4" />
              <button
                onClick={() => setCurrentPage('settings')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Settings size={20} />
                  </div>
                  <span className="font-bold text-gray-700">设置</span>
                </div>
                <ChevronRight size={20} className="text-gray-200" />
              </button>
              <div className="h-px bg-gray-50 mx-4" />
              <button
                onClick={() => setCurrentPage('about')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Info size={20} />
                  </div>
                  <span className="font-bold text-gray-700">关于应用</span>
                </div>
                <ChevronRight size={20} className="text-gray-200" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const renderAdminAI = () => (
    <div className="flex flex-col h-full bg-gray-50 pb-24 overflow-y-auto">
      <header className="p-6 flex items-center justify-between bg-white sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => setCurrentPage('profile')} className="text-gray-400 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-gray-900">AI后台管理</h2>
        <button onClick={loadAdminConfig} className="text-blue-500 text-sm font-bold">{adminLoading ? '刷新中' : '刷新'}</button>
      </header>

      <div className="p-6 space-y-5">
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900">AI 提供方</h3>
          <div className="grid grid-cols-2 gap-3">
            {(adminProviders.length > 0 ? adminProviders : ['local_model', 'external_ai_api']).map((provider) => (
              <button
                key={provider}
                onClick={() => setAdminProvider(provider)}
                className={`py-3 rounded-2xl text-sm font-bold border transition-colors ${adminProvider === provider ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}
              >
                {provider}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900">外部AI接口配置</h3>
          <div className="space-y-3">
            <input
              value={adminEndpoint}
              onChange={(e) => setAdminEndpoint(e.target.value)}
              placeholder="Endpoint URL"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              value={adminModel}
              onChange={(e) => setAdminModel(e.target.value)}
              placeholder="Model"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              value={adminTimeoutMs}
              onChange={(e) => setAdminTimeoutMs(e.target.value)}
              placeholder="Timeout(ms)"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              value={adminApiKey}
              onChange={(e) => setAdminApiKey(e.target.value)}
              placeholder={adminApiKeyMasked ? `当前Key: ${adminApiKeyMasked}` : 'API Key'}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <button
            onClick={saveAdminConfig}
            className="w-full h-11 rounded-xl bg-blue-500 text-white font-bold active:scale-95 transition-transform"
          >
            {adminSaving ? '保存中...' : '保存配置'}
          </button>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900">识别接口测试</h3>
          <div className="flex gap-3">
            <button
              onClick={() => adminTestFileInputRef.current?.click()}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 font-bold active:scale-95 transition-transform"
            >
              选择测试图片
            </button>
            <button
              onClick={runAdminAnalyze}
              className="flex-1 h-11 rounded-xl bg-indigo-500 text-white font-bold active:scale-95 transition-transform"
            >
              {adminTesting ? '识别中...' : '开始识别'}
            </button>
          </div>
          <input
            type="file"
            ref={adminTestFileInputRef}
            onChange={handleAdminTestFileSelect}
            accept="image/*"
            className="hidden"
          />
          {adminTestImage && (
            <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden">
              <img src={adminTestImage} alt="test" className="w-full h-full object-cover" />
            </div>
          )}
          {adminTestResult && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 space-y-2">
              <p className="text-sm font-bold text-indigo-700">诊断：{adminTestResult.diagnosis}</p>
              <p className="text-xs text-indigo-700">概率：{adminTestResult.probability}%</p>
              <p className="text-xs text-indigo-700 leading-relaxed">{adminTestResult.description}</p>
            </div>
          )}
        </div>

        {adminMessage && (
          <div className="px-4 py-3 rounded-2xl bg-blue-50 text-blue-700 text-sm font-medium">
            {adminMessage}
          </div>
        )}
      </div>
    </div>
  );

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
          {currentPage === 'home' && renderHome()}
          {currentPage === 'camera' && renderCamera()}
          {currentPage === 'analysis' && renderAnalysis()}
          {currentPage === 'result' && renderResult()}
          {currentPage === 'records' && renderRecords()}
          {currentPage === 'record_detail' && renderRecordDetail()}
          {currentPage === 'diary' && renderDiary()}
          {currentPage === 'diary_detail' && renderDiaryDetail()}
          {currentPage === 'profile' && renderProfile()}
          {currentPage === 'admin_ai' && renderAdminAI()}
          {currentPage === 'consultations' && renderPlaceholderPage('我的咨询', <MessageSquare size={48} />)}
          {currentPage === 'appointments' && renderPlaceholderPage('专家预约', <Calendar size={48} />)}
          {currentPage === 'settings' && renderPlaceholderPage('设置', <Settings size={48} />)}
          {currentPage === 'about' && renderPlaceholderPage('关于应用', <Info size={48} />)}
        </motion.div>
      </AnimatePresence>

      {!['camera', 'analysis', 'result', 'record_detail'].includes(currentPage) && (
        <BottomNav activePage={currentPage} onNavigate={setCurrentPage} />
      )}
    </div>
  );
}
