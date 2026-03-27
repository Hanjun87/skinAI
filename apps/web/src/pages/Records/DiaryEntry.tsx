import React, { useState } from 'react';
import { Camera, Sun, ShieldCheck, Pill, Plus, GripVertical, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DiaryEntryProps {
  onNavigate: (page: string) => void;
}

export function DiaryEntry({ onNavigate }: DiaryEntryProps) {
  const [measures, setMeasures] = useState(["涂抹防晒霜"]);

  const toggleMeasure = (m: string) => {
    setMeasures(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-32">
      <header className="p-6 flex items-center justify-center bg-white sticky top-0 z-10 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">健康档案</h1>
        <button
          onClick={() => onNavigate('history')}
          className="absolute right-6 text-blue-500 text-xs font-medium"
        >
          历史记录
        </button>
      </header>
      
      <div className="p-4">
        <div className="flex bg-gray-200 p-1 rounded-xl mb-8">
          <button 
            onClick={() => onNavigate('records')}
            className="flex-1 py-2 text-sm font-bold text-center rounded-lg transition-all text-gray-500"
          >
            检测记录
          </button>
          <button 
            className="flex-1 py-2 text-sm font-bold text-center rounded-lg transition-all bg-white text-blue-600 shadow-sm"
          >
            皮肤日记
          </button>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Camera className="text-blue-600" size={20} />
              <span>拍摄每日状况</span>
            </h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-white cursor-pointer hover:border-blue-400 transition-colors">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <Camera className="text-blue-600" size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">点击拍摄或上传照片</p>
                  <p className="text-xs text-gray-400 mt-1">记录今日肤色照片，追踪细微变化</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 rounded-xl bg-[#F2C19E] shadow-inner" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">真实肤色截取</p>
                  <p className="text-xs text-gray-400">从今日照片中自动提取色值</p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="text-[10px] font-bold text-blue-600">当前色调</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sun className="text-amber-500" size={20} />
              <span>今日阳光</span>
            </h2>
            <div className="bg-gray-100 p-6 rounded-2xl">
              <div className="flex justify-between items-end mb-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">当前紫外线指数</p>
                  <p className="text-3xl font-bold text-blue-600">中等 (4.2)</p>
                </div>
                <Sun className="text-amber-400" size={40} />
              </div>
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-[42%] bg-gradient-to-r from-blue-400 to-amber-400 rounded-full" />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-medium text-gray-400 uppercase">
                <span>弱</span>
                <span>中</span>
                <span>强</span>
                <span>极强</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" size={20} />
              <span>防晒措施</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {["涂抹防晒霜", "遮阳伞", "防晒衣", "太阳镜"].map((m) => (
                <button 
                  key={m}
                  onClick={() => toggleMeasure(m)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                    measures.includes(m) 
                      ? "bg-white border-blue-600/10 shadow-sm" 
                      : "bg-gray-100 border-transparent text-gray-400"
                  )}
                >
                  <span className="text-sm font-medium">{m}</span>
                  {measures.includes(m) && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Pill className="text-indigo-600" size={20} />
                <span>用药/护肤记录</span>
              </h2>
              <button className="text-blue-600 text-sm font-bold flex items-center gap-1">
                <Plus size={16} />
                <span>添加</span>
              </button>
            </div>
            <div className="space-y-2">
              {[
                { name: "水杨酸精华液", desc: "晚间使用 · 2滴" },
                { name: "神经酰胺修护霜", desc: "早晚使用 · 适量" }
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-50">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Pill className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <GripVertical size={16} className="text-gray-300" />
                </div>
              ))}
            </div>
          </section>

          <button className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-lg active:scale-[0.98] transition-all mt-8">
            保存今日日记
          </button>
          <p className="text-center text-xs text-gray-400">记录已自动同步至健康档案</p>
        </div>
      </div>
    </div>
  );
}
