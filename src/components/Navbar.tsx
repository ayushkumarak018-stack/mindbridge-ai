import React, { useState } from 'react';
import { 
  Sparkles, 
  Sun, 
  Moon, 
  Mic, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Globe, 
  User, 
  BrainCircuit 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { AppLanguage } from '../types';

interface NavbarProps {
  onOpenVoice: () => void;
  onOpenThreatModal: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenVoice,
  onOpenThreatModal,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const { user, profile, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const languages: { code: AppLanguage; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'hinglish', label: 'Hinglish', flag: '🇮🇳' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-mobile-sidebar"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-200">
                MindBridge
              </span>
              <span className="ml-1 text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                AI
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Tools & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Security & Threat Model button */}
          <button
            id="btn-threat-model"
            onClick={onOpenThreatModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100/60 dark:hover:bg-emerald-950/60 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security Model</span>
          </button>

          {/* Voice Input Trigger */}
          <button
            id="btn-open-voice-nav"
            onClick={onOpenVoice}
            title={t.voiceInput}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-all"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              id="btn-language-selector"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">
                {languages.find((l) => l.code === language)?.label}
              </span>
              <span className="sm:hidden uppercase">{language}</span>
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    id={`btn-lang-${l.code}`}
                    onClick={() => {
                      setLanguage(l.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                      language === l.code
                        ? 'font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{l.label}</span>
                    <span>{l.flag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark / Light Toggle */}
          <button
            id="btn-toggle-theme"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile & Sign Out */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-indigo-200 dark:border-indigo-900 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                  {profile?.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <button
                id="btn-sign-out"
                onClick={signOut}
                title={t.signOut}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
