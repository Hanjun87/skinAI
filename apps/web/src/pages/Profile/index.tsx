import React from 'react';
import { Calendar, ChevronRight, Info, MessageSquare, Scan, Settings } from 'lucide-react';
import { Page } from '../../types';

export default function Profile({ onNavigate }: { onNavigate: (p: Page) => void }) {
  return (
    <div className="flex flex-col h-full bg-gray-50 pb-24 overflow-y-auto">
      <header className="p-6 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="w-6" />
        <h2 className="text-lg font-bold text-gray-900">个人中心</h2>
        <button onClick={() => onNavigate('settings')} className="text-gray-400"><Settings size={24} /></button>
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
              <button onClick={() => onNavigate('consultations')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <MessageSquare size={20} />
                  </div>
                  <span className="font-bold text-gray-700">我的咨询</span>
                </div>
                <ChevronRight size={20} className="text-gray-200" />
              </button>
              <div className="h-px bg-gray-50 mx-4" />
              <button onClick={() => onNavigate('appointments')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
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
              <button onClick={() => onNavigate('settings')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Settings size={20} />
                  </div>
                  <span className="font-bold text-gray-700">设置</span>
                </div>
                <ChevronRight size={20} className="text-gray-200" />
              </button>
              <div className="h-px bg-gray-50 mx-4" />
              <button onClick={() => onNavigate('about')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
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
}
