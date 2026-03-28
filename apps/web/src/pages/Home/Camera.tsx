import React from 'react';
import { ArrowLeft, Flashlight, Camera as CameraIcon, Image as ImageIcon, Scan } from 'lucide-react';
import { motion } from 'motion/react';
import { Page } from '../../types';

export default function Camera({
  videoRef,
  canvasRef,
  fileInputRef,
  cameraReady,
  cameraError,
  cameraLoading,
  startCamera,
  takePhoto,
  onNavigate,
  onFileSelect,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraReady: boolean;
  cameraError: string;
  cameraLoading: boolean;
  startCamera: () => void;
  takePhoto: () => void;
  onNavigate: (p: Page) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-black z-50 flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={() => onNavigate('home')} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
          <ArrowLeft size={24} />
        </button>
        <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
          <Flashlight size={24} />
        </button>
      </div>
      <div className="flex-grow relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_52%)]"
          animate={{ opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {!cameraReady && (
          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center px-8 text-center">
            <p className="text-white text-sm mb-4">{cameraError || (cameraLoading ? '正在开启摄像头...' : '请先开启摄像头权限')}</p>
            <button onClick={startCamera} className="px-5 py-2.5 rounded-full bg-blue-500 text-white text-sm font-semibold active:scale-95 transition-transform">
              {cameraLoading ? '开启中...' : '开启摄像头'}
            </button>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-72 border-2 border-blue-500/50 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
            <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
          </div>
        </div>
        <motion.div
          className="pointer-events-none absolute bottom-12 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl"
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="bg-white p-8 pb-12 rounded-t-[40px] flex flex-col items-center">
        <p className="text-gray-500 text-sm mb-8">请将镜头对准，并保持光线充足</p>
        <div className="flex items-center justify-between w-full max-w-xs">
          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
              <ImageIcon size={24} />
            </div>
            <span className="text-[10px] text-gray-400">相册</span>
          </button>
          <button onClick={takePhoto} className="w-20 h-20 rounded-full border-4 border-blue-100 p-1 active:scale-90 transition-transform">
            <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <CameraIcon size={32} />
            </div>
          </button>
          <div className="w-12" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} onChange={onFileSelect} accept="image/*" className="hidden" />
    </div>
  );
}
