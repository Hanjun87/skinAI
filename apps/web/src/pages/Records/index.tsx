import React, { useState } from 'react';
import { ChevronRight, Scan, Search, Eye, Plus } from 'lucide-react';
import { Record as SkinRecord } from '../../types';
import { cn } from '../../lib/utils';

interface RecordsProps {
  records: SkinRecord[];
  onSelect: (record: SkinRecord) => void;
  onNavigate: (page: string) => void;
  activeTab?: 'records' | 'diary';
}

const SAMPLE_RECORDS = [
  {
    id: '1',
    title: "过敏性皮炎",
    date: "2023年10月24日 · 下午 2:30",
    status: "恢复中" as const,
    statusColor: "bg-emerald-100 text-emerald-700",
    image: "https://picsum.photos/seed/skin1/200/200",
  },
  {
    id: '2',
    title: "轻微擦伤",
    date: "2023年10月18日 · 上午 10:15",
    status: "待复查" as const,
    statusColor: "bg-blue-100 text-blue-700",
    image: "https://picsum.photos/seed/skin2/200/200",
  },
];

const OLDER_RECORDS = [
  {
    id: '3',
    title: "慢性湿疹",
    date: "2023年09月05日 · 下午 4:50",
    status: "已结束" as const,
    statusColor: "bg-gray-100 text-gray-600",
    image: "https://picsum.photos/seed/skin3/200/200",
  },
];

export default function Records({
  records,
  onSelect,
  onNavigate,
  activeTab = 'records',
}: RecordsProps) {
  const [currentTab, setCurrentTab] = useState<'records' | 'diary'>(activeTab);

  const allRecords = records.length > 0 ? records : SAMPLE_RECORDS.map(r => ({
    ...r,
    probability: 0.85,
    typicalImage: r.image,
  }));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      <header className="p-6 flex items-center justify-center bg-white sticky top-0 z-10 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">健康档案</h2>
        <button 
          onClick={() => onNavigate('history')}
          className="absolute right-6 text-blue-500 text-xs font-medium"
        >
          历史记录
        </button>
      </header>

      <div className="p-4">
        <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setCurrentTab('records')}
            className={cn(
              "flex-1 py-2 text-sm font-bold text-center rounded-lg transition-all",
              currentTab === 'records' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            检测记录
          </button>
          <button 
            onClick={() => onNavigate('diary')}
            className={cn(
              "flex-1 py-2 text-sm font-bold text-center rounded-lg transition-all",
              currentTab === 'diary' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            皮肤日记
          </button>
        </div>

        {currentTab === 'records' && (
          <>
            <section className="mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">最近记录</h3>
              <div className="space-y-3">
                {allRecords.slice(0, 2).map((record) => (
                  <RecordCard key={record.id} record={record} onSelect={onSelect} />
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">更早记录</h3>
              <div className="space-y-3">
                {allRecords.slice(2).map((record) => (
                  <RecordCard key={record.id} record={record} onSelect={onSelect} />
                ))}
                {OLDER_RECORDS.map((record) => (
                  <RecordCard 
                    key={record.id} 
                    record={{
                      ...record,
                      probability: 0.75,
                      typicalImage: record.image,
                    }} 
                    onSelect={onSelect} 
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      <button 
        onClick={() => onNavigate('diary')}
        className="fixed right-6 bottom-24 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus size={32} />
      </button>
    </div>
  );
}

interface RecordCardProps {
  record: SkinRecord & { statusColor?: string };
  onSelect: (r: SkinRecord) => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, onSelect }) => {
  const statusColorMap: Record<string, string> = {
    '恢复中': 'bg-emerald-100 text-emerald-700',
    '待复查': 'bg-blue-100 text-blue-700',
    '已结束': 'bg-gray-100 text-gray-600',
  };

  return (
    <button
      onClick={() => onSelect(record)}
      className="w-full flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-left"
    >
      <img src={record.image} alt={record.title} className="w-16 h-16 rounded-lg object-cover border border-gray-100" referrerPolicy="no-referrer" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-bold text-gray-900 truncate">{record.title}</h4>
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", statusColorMap[record.status] || 'bg-gray-100 text-gray-600')}>{record.status}</span>
        </div>
        <p className="text-[10px] text-gray-400 mb-2">{record.date}</p>
        <div className="flex items-center gap-1 text-blue-600 text-[10px] font-bold">
          <Eye size={14} />
          <span>查看报告</span>
        </div>
      </div>
      <ChevronRight size={20} className="text-gray-300" />
    </button>
  );
};
