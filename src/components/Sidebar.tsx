import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  HelpCircle, 
  Target, 
  Scale, 
  Lightbulb, 
  Sparkles, 
  History, 
  Shield, 
  BarChart3 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type TabType = 
  | 'dashboard' 
  | 'journal' 
  | 'problems' 
  | 'goals' 
  | 'decisions' 
  | 'brainstorm' 
  | 'insights' 
  | 'history' 
  | 'privacy';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { t } = useLanguage();

  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'journal', label: t.journal, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'problems', label: t.problemSolver, icon: <HelpCircle className="w-4 h-4" />, badge: 'Real-Time' },
    { id: 'goals', label: t.goals, icon: <Target className="w-4 h-4" /> },
    { id: 'decisions', label: t.decisions, icon: <Scale className="w-4 h-4" /> },
    { id: 'brainstorm', label: t.brainstorm, icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'insights', label: t.insights, icon: <Sparkles className="w-4 h-4" /> },
    { id: 'history', label: t.history, icon: <History className="w-4 h-4" /> },
    { id: 'privacy', label: t.memoryPrivacy, icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-md p-4 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full justify-between">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 dark:bg-indigo-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Privacy & Cloud Architecture Note */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 mb-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Isolated Storage</span>
            </div>
            <p>
              All reflections, problem sessions, and memories are strictly bound to your private Firebase UID.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
