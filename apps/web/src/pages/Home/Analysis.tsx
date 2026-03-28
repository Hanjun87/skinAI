import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

export default function Analysis({ capturedImage }: { capturedImage: string | null }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_58%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 text-center">
      <motion.div
        className="absolute top-16 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl"
        animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm aspect-square rounded-[32px] overflow-hidden mb-12 relative shadow-[0_28px_90px_rgba(59,130,246,0.16)]"
      >
        {capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 border-4 border-blue-500/30 rounded-3xl" />
        <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-500" />
        <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-500" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-500" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-500" />
        <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }} className="absolute left-0 right-0 h-1 bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.8)]" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-2 mb-4"
      >
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <h2 className="text-xl font-bold text-gray-900">AI 正在深度分析中...</h2>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 text-sm text-gray-400"
      >
        正在识别皮损特征、颜色分布及边缘轮廓，请稍候
      </motion.p>
      <div className="w-full overflow-hidden rounded-full bg-gray-100 h-2.5">
        <motion.div initial={{ width: '8%' }} animate={{ width: '100%' }} transition={{ duration: 4.2, ease: 'easeInOut' }} className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.44, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="mt-24 flex items-start gap-4 rounded-[24px] border border-blue-100 bg-white/80 p-4 text-left shadow-[0_18px_48px_rgba(59,130,246,0.08)] backdrop-blur-xl"
      >
        <AlertCircle size={20} className="text-blue-500 shrink-0" />
        <div>
          <h4 className="font-bold text-blue-900 text-sm mb-1">医疗免责声明</h4>
          <p className="text-blue-700 text-[10px] leading-relaxed">AI分析结果仅供参考，不作为最终医疗诊断。如果症状严重或持续，请咨询专业皮肤科医生。</p>
        </div>
      </motion.div>
    </div>
  );
}
