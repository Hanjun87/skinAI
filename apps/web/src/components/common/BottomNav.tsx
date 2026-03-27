import React from 'react';
import { Camera, FileText, User, Users } from 'lucide-react';
import { Page } from '../../types';

export const BottomNav = ({ activePage, onNavigate }: { activePage: Page, onNavigate: (p: Page) => void }) => {
  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: '识别', icon: <Camera size={24} /> },
    { id: 'records', label: '档案', icon: <FileText size={24} /> },
    { id: 'community', label: '社区', icon: <Users size={24} /> },
    { id: 'profile', label: '我的', icon: <User size={24} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-6 py-3 pb-8 flex justify-between items-center z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex flex-col items-center gap-1 transition-colors ${(activePage === item.id ||
            (item.id === 'profile' && ['consultations', 'appointments', 'settings', 'about'].includes(activePage)) ||
            (item.id === 'records' && ['diary', 'history'].includes(activePage)))
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
