import React from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  HelpCircle, 
  Target, 
  Scale, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Zap, 
  Compass, 
  BookOpen 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'motion/react';

interface LandingPageProps {
  onOpenThreatModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenThreatModal }) => {
  const { signInWithGoogle, signInAsDemoUser, loading, error } = useAuth();
  const { t } = useLanguage();

  const features = [
    {
      icon: <HelpCircle className="w-6 h-6 text-amber-500" />,
      title: 'Real-Time AI Problem Solving',
      desc: 'Move from problem analysis to multi-solution evaluation, live iterative strategy adjustments, and structured resolution summaries.',
    },
    {
      icon: <BookOpen className="w-6 h-6 text-indigo-500" />,
      title: 'Multi-Turn AI Reflection',
      desc: 'Conversational journaling that automatically extracts actionable intelligence, core dilemmas, and progress milestones.',
    },
    {
      icon: <Target className="w-6 h-6 text-emerald-500" />,
      title: 'SMART Goal Management',
      desc: 'Convert ambitious goals into realistic micro-milestones with automated breakdown and step-by-step progress tracking.',
    },
    {
      icon: <Scale className="w-6 h-6 text-purple-500" />,
      title: 'Decision Assistant',
      desc: 'Side-by-side factor matrix comparison evaluating trade-offs, pros/cons, and reflective prompts for high-stakes dilemmas.',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-pink-500" />,
      title: 'Multidisciplinary Brainstorming',
      desc: 'Expand initial concepts into innovative angles, 10x differentiator hypotheses, and practical launch blueprints.',
    },
    {
      icon: <Lock className="w-6 h-6 text-cyan-500" />,
      title: 'Privacy-First AI Memory',
      desc: 'Strictly isolated by Firebase UID. Retrieve past context when helpful, with full controls to inspect or wipe anytime.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">MindBridge AI</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-landing-threat-model"
            onClick={onOpenThreatModal}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Security Model</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex-1 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personal Thinking & Real-Time Problem-Solving Workspace</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight sm:leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-slate-100 dark:to-indigo-200">
            More than a chatbot.
            <br />
            Your real-time AI companion for life & work.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Move seamlessly from <strong className="text-slate-800 dark:text-slate-200 font-semibold">Problem → Understanding → Options → Action → Resolution → Learning</strong>.
            Grounded in multi-lingual Gemini intelligence, Firebase secure authentication, and private memory isolation.
          </p>

          {error && (
            <div className="p-3.5 mb-6 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs max-w-md mx-auto">
              {error}
            </div>
          )}

          {/* Authentication CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <button
              id="btn-google-sign-in"
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t.signInWithGoogle}</span>
            </button>

            <button
              id="btn-guest-sign-in"
              onClick={signInAsDemoUser}
              disabled={loading}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm shadow-xs transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{t.exploreAsGuest}</span>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> No password needed
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Private UID isolation
            </span>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
              className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all group"
            >
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl w-fit mb-4 group-hover:scale-105 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-base font-bold mb-2 text-slate-900 dark:text-slate-100">{f.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <p>© 2026 MindBridge AI. Built with Firebase & Google Gemini API.</p>
        <div className="flex items-center gap-4">
          <button
            id="btn-footer-security"
            onClick={onOpenThreatModal}
            className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Threat Model & Architecture
          </button>
          <span>•</span>
          <span>Privacy Guaranteed</span>
        </div>
      </footer>
    </div>
  );
};
