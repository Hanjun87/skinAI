import React from 'react';
import { AlertCircle, ArrowLeft, Droplets, Scan } from 'lucide-react';
import { Record } from '../../types';

export default function RecordDetail({
  record,
  onBack,
}: {
  record: Record | null;
  onBack: () => void;
}) {
  if (!record) return null;
  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-32">
      <header className="p-6 flex items-center justify-between bg-white sticky top-0 z-10 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-400 active:scale-90 transition-transform">
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
        <p className="text-gray-400 text-xs mb-1 uppercase tracking-widest font-bold">Health Record ID: {record.id}008273</p>
        <h1 className="text-3xl font-black text-gray-900 mb-2">{record.title}</h1>
        <div className="flex justify-center items-center gap-3">
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${record.status === '恢复中' ? 'bg-emerald-100 text-emerald-600' : record.status === '待复查' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{record.status}</span>
          <span className="text-gray-300">|</span>
          <span className="text-xs text-gray-400 font-medium">{record.date}</span>
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
              <p className="text-lg font-black text-blue-500">{record.probability}%</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">当前记录仅保存疾病名称与置信度。此次识别为 {record.title}，建议结合线下面诊结果综合判断。</p>
          <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-[10px] text-gray-400 font-bold mb-2 uppercase">AI Analysis Summary</p>
            <p className="text-xs text-gray-500 italic">根据影像特征分析，该症状与{record.title}的典型临床表现高度吻合，建议持续观察并按时复诊。</p>
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
                <img src={record.image} alt="User" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-900">记录照片</p>
                <p className="text-[10px] text-gray-400">Captured Image</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                <img src={record.typicalImage} alt="Typical" className="w-full h-full object-cover" />
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
            <h3 className="font-bold text-gray-900">健康建议</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">1</div>
              <span className="text-gray-700 text-sm font-medium">持续观察 {record.title} 相关变化，避免刺激患处。</span>
            </div>
            <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">2</div>
              <span className="text-gray-700 text-sm font-medium">若短期内出现扩散、出血或明显加重，请及时就医复查。</span>
            </div>
          </div>
        </div>
        <div className="p-8 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center text-center opacity-60">
          <AlertCircle size={32} className="text-gray-300 mb-2" />
          <p className="text-[10px] text-gray-400 leading-relaxed">本报告由 知己肤 智能分析系统生成，仅供健康参考。若症状持续或加重，请立即前往正规医院皮肤科就诊。</p>
        </div>
      </div>
    </div>
  );
}
