import React from 'react';
import { Search, Filter, Sun, Cloud, Thermometer, Droplets, ImageOff, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HistoryProps {
  onNavigate: (page: string) => void;
}

const HISTORY_DATA = [
  {
    date: "2023年10月24日 星期二",
    uv: 5,
    temp: "24°C 晴",
    status: "轻微红肿，伴有瘙痒。T区出油较多，两颊干燥。",
    tags: ["水杨酸精华", "B5修复霜", "停用美白精华"],
    image: "https://picsum.photos/seed/skin4/200/200",
    weatherIcon: Sun,
    weatherColor: "text-amber-500"
  },
  {
    date: "2023年10月23日 星期一",
    uv: 2,
    humidity: "82%",
    status: "状态平稳，红肿消退。持续保持温和补水。",
    tags: ["透明质酸乳液", "物理防晒"],
    image: "https://picsum.photos/seed/skin5/200/200",
    weatherIcon: Cloud,
    weatherColor: "text-blue-500"
  },
  {
    date: "2023年10月22日 星期日",
    uv: 8,
    temp: "28°C 晴",
    status: "全天户外运动，面部有发热感。下颌处有闭口。",
    tags: ["晒后修复冰晶"],
    image: null,
    weatherIcon: Sun,
    weatherColor: "text-amber-500"
  }
];

export function History({ onNavigate }: HistoryProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      <header className="p-6 flex items-center justify-center bg-white sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => onNavigate('diary')}
          className="absolute left-6 text-blue-500"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">历史日记列表</h1>
      </header>

      <main className="p-4 space-y-6">
        <div className="bg-gray-100 rounded-xl p-3 flex items-center gap-3">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="搜索日记、关键词或产品..."
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-gray-400"
          />
          <Filter size={20} className="text-blue-600" />
        </div>

        <div className="relative space-y-6">
          <div className="absolute left-4 top-2 bottom-0 w-px bg-gray-200" />

          {HISTORY_DATA.map((entry, idx) => (
            <div key={idx} className="relative pl-10">
              <div className={cn(
                "absolute left-[13px] top-2 w-2.5 h-2.5 rounded-full border-4 border-gray-50",
                idx === 0 ? "bg-blue-600" : "bg-gray-300"
              )} />

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <h2 className="font-bold text-gray-900 text-sm">{entry.date}</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded">
                        <entry.weatherIcon size={12} className={entry.weatherColor} />
                        <span className="text-[10px] font-medium text-gray-500">UV: {entry.uv}</span>
                      </div>
                      {entry.temp && (
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded">
                          <Thermometer size={12} className="text-blue-400" />
                          <span className="text-[10px] font-medium text-gray-500">{entry.temp}</span>
                        </div>
                      )}
                      {entry.humidity && (
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded">
                          <Droplets size={12} className="text-blue-400" />
                          <span className="text-[10px] font-medium text-gray-500">湿度 {entry.humidity}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {entry.image ? (
                    <img src={entry.image} alt="Skin" className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                      <ImageOff size={20} className="text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-[10px] font-bold text-blue-600 block mb-1">当前状态</span>
                    <p className="text-xs text-gray-700 leading-relaxed">{entry.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map(tag => (
                      <span
                        key={tag}
                        className={cn(
                          "text-[10px] font-medium px-3 py-1 rounded-full",
                          tag.includes("停用") ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full py-4 rounded-2xl bg-gray-100 text-blue-600 font-bold text-sm active:scale-95 transition-all">
          查看更多往期记录
        </button>
      </main>
    </div>
  );
}
