import React from 'react';
import { motion } from 'motion/react';
import { Camera, FileText, User, Users } from 'lucide-react';
import { Page } from '../../types';
import { cn } from '../../lib/utils';

export const BottomNav = ({ activePage, onNavigate }: { activePage: Page, onNavigate: (p: Page) => void }) => {
  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: '识别', icon: <Camera size={24} /> },
    { id: 'records', label: '档案', icon: <FileText size={24} /> },
    { id: 'community', label: '社区', icon: <Users size={24} /> },
    { id: 'profile', label: '我的', icon: <User size={24} /> },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-24px)] max-w-[calc(28rem-24px)] -translate-x-1/2 overflow-hidden rounded-[32px] border border-white/60 bg-white/55 px-3 py-3 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-[22px]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.36))]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-12 rounded-full bg-white/55 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/2 h-20 w-40 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="relative grid grid-cols-4 gap-2">
      {navItems.map((item) => (
        <motion.button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 520, damping: 30 }}
          className={cn(
            'relative flex min-h-[68px] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-2 text-xs font-semibold transition-all duration-300',
            (activePage === item.id ||
              (item.id === 'profile' && ['consultations', 'appointments', 'settings', 'about'].includes(activePage)) ||
              (item.id === 'records' && ['diary', 'history'].includes(activePage)))
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          )}
        >
          {(activePage === item.id ||
            (item.id === 'profile' && ['consultations', 'appointments', 'settings', 'about'].includes(activePage)) ||
            (item.id === 'records' && ['diary', 'history'].includes(activePage))) && (
            <motion.div
              layoutId="bottom-nav-active-pill"
              className="absolute inset-0 rounded-[22px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(219,234,254,0.82))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_32px_rgba(59,130,246,0.14)] backdrop-blur-xl"
              transition={{ type: 'spring', stiffness: 620, damping: 38, mass: 0.72 }}
            />
          )}
          <motion.div
            animate={{
              y: activePage === item.id ? -1 : 0,
              scale: activePage === item.id ? 1.03 : 1,
            }}
            transition={{ type: 'spring', stiffness: 460, damping: 28 }}
            className="relative z-10"
          >
            {item.icon}
          </motion.div>
          <motion.span
            animate={{
              opacity: activePage === item.id ? 1 : 0.72,
            }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-[11px] font-bold"
          >
            {item.label}
          </motion.span>
        </motion.button>
      ))}
      </div>
    </nav>
  );
};
