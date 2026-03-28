import React from 'react';
import { Camera, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Page } from '../../types';

export default function Home({ onNavigate }: { onNavigate: (p: Page) => void }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="relative overflow-hidden px-6 pb-10 pt-12">
        <motion.div
          className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_72%)]"
          animate={{ scale: [1, 1.04, 1], opacity: [0.85, 1, 0.9] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="flex justify-between items-center mb-2">
          <div className="relative z-10">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.32em] text-blue-500/80">知己肤</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">您好，访客</h1>
            <p className="mt-2 text-sm text-slate-500">现代化 AI 皮肤检测与健康管理体验</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.04 }}
            className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-blue-500 shadow-lg shadow-blue-100 backdrop-blur-xl"
          >
            <User size={24} />
          </motion.div>
        </div>
      </header>
      <main className="flex flex-grow flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="mb-6 rounded-[28px] border border-white/60 bg-white/70 px-5 py-4 text-left shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]" />
            <span className="text-xs font-semibold text-slate-500">实时检测引擎已就绪</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            拍照后将自动进入连续识别流程，切换动画与页面状态会保持统一体验。
          </p>
        </div>
        <div className="relative mb-12">
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.08, 0.18, 0.08] }}
            transition={{ repeat: Infinity, duration: 4.2, ease: 'easeInOut' }}
            className="absolute inset-[-18px] rounded-full bg-blue-500 blur-xl"
          />
          <motion.div
            animate={{ scale: [1, 1.06, 1], rotate: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 5.2, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 via-cyan-400/20 to-violet-400/20"
          />
          <motion.button
            onClick={() => onNavigate('camera')}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            className="relative z-10 flex h-52 w-52 flex-col items-center justify-center rounded-full bg-[linear-gradient(145deg,#2563eb_0%,#3b82f6_55%,#60a5fa_100%)] shadow-[0_24px_80px_rgba(37,99,235,0.45)]"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
              className="mb-3 rounded-3xl bg-white/16 p-4 backdrop-blur-xl"
            >
              <Camera size={62} className="text-white" />
            </motion.div>
            <span className="text-xl font-black tracking-wide text-white">拍照识别</span>
            <span className="mt-2 text-xs font-medium text-blue-100">进入沉浸式检测流程</span>
          </motion.button>
        </div>
        <div className="grid w-full gap-3">
          <div className="rounded-[24px] border border-white/60 bg-white/80 px-4 py-4 text-left shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Flow</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">拍照 → 分析 → 报告</p>
            <p className="mt-1 text-sm text-slate-500">统一的转场节奏与状态反馈让整个识别过程更自然。</p>
          </div>
          <div className="text-xs text-gray-400">AI 技术仅供参考，如有不适请及时就医</div>
        </div>
      </main>
    </div>
  );
}
