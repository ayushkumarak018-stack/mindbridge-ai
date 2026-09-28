import React from 'react';
import { Sparkles, ArrowRight, X, Lightbulb, Target, Compass } from 'lucide-react';
import { ProactiveSuggestion } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ProactiveInsightBannerProps {
  suggestion: ProactiveSuggestion | null;
  onDismiss: (id: string) => void;
  onActionClick: (suggestion: ProactiveSuggestion) => void;
}

export const ProactiveInsightBanner: React.FC<ProactiveInsightBannerProps> = ({
  suggestion,
  onDismiss,
  onActionClick,
}) => {
  if (!suggestion || suggestion.dismissed) return null;

  const getIcon = (type: ProactiveSuggestion['type']) => {
    switch (type) {
      case 'deadline':
      case 'goal_reminder':
        return <Target className="w-5 h-5 text-indigo-500" />;
      case 'problem_followup':
        return <Compass className="w-5 h-5 text-amber-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="mb-6 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-indigo-100 dark:border-indigo-900/60 shrink-0 mt-0.5">
              {getIcon(suggestion.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  AI Proactive Companion
                </span>
                <span className="text-xs text-slate-400 font-medium">Just now</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                {suggestion.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {suggestion.description}
              </p>
            </div>
          </div>

          <button
            id={`btn-dismiss-suggestion-${suggestion.id}`}
            onClick={() => onDismiss(suggestion.id)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {suggestion.actionLabel && (
          <div className="mt-3 ml-11 flex items-center gap-2">
            <button
              id={`btn-act-suggestion-${suggestion.id}`}
              onClick={() => onActionClick(suggestion)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <span>{suggestion.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
