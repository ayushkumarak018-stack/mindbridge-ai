import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  Lightbulb, 
  Scale, 
  Target, 
  BarChart3, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Compass, 
  Plus, 
  ChevronRight 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, collection, getDocs, query, orderBy, onSnapshot } from '../firebase';
import { TabType } from '../components/Sidebar';
import { Goal, ProblemSession, JournalEntry, ProactiveSuggestion } from '../types';
import { ProactiveInsightBanner } from '../components/ProactiveInsightBanner';
import { api } from '../services/api';
import { motion } from 'motion/react';

interface DashboardPageProps {
  onNavigate: (tab: TabType, extra?: any) => void;
  onOpenVoice: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenVoice }) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [recentProblems, setRecentProblems] = useState<ProblemSession[]>([]);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [proactiveSuggestion, setProactiveSuggestion] = useState<ProactiveSuggestion | null>(null);
  const [dailyInsight, setDailyInsight] = useState<string>('Reflecting on problems and writing down your thoughts creates mental clarity and actionable focus.');
  const [loading, setLoading] = useState(true);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    if (!user) return;

    // Load active goals
    const goalsRef = collection(db, 'users', user.uid, 'goals');
    const unsubscribeGoals = onSnapshot(goalsRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
      setActiveGoals(list.filter((g) => !g.completed));
    });

    // Load recent problem sessions
    const problemsRef = collection(db, 'users', user.uid, 'problemSessions');
    const unsubscribeProblems = onSnapshot(problemsRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProblemSession));
      setRecentProblems(list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0, 3));
    });

    // Load recent journal entries
    const journalRef = collection(db, 'users', user.uid, 'journalEntries');
    const unsubscribeJournal = onSnapshot(journalRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JournalEntry));
      setRecentEntries(list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0, 3));
      setLoading(false);
    });

    // Proactive suggestion scan
    if (profile?.proactiveInsightsEnabled) {
      api.scanProactiveInsights({ uid: user.uid }).then((res) => {
        if (res.suggestions && res.suggestions.length > 0) {
          setProactiveSuggestion(res.suggestions[0]);
        }
      }).catch(() => {});
    }

    return () => {
      unsubscribeGoals();
      unsubscribeProblems();
      unsubscribeJournal();
    };
  }, [user, profile?.proactiveInsightsEnabled]);

  const handleDismissSuggestion = (id: string) => {
    setProactiveSuggestion(null);
  };

  const handleActionSuggestion = (sug: ProactiveSuggestion) => {
    if (sug.actionType === 'open_goal') {
      onNavigate('goals');
    } else if (sug.actionType === 'open_problem') {
      onNavigate('problems', { problemId: sug.actionTargetId });
    } else if (sug.actionType === 'open_journal') {
      onNavigate('journal');
    } else {
      onNavigate('insights');
    }
  };

  const actionCards = [
    {
      id: 'card-reflection',
      tab: 'journal' as TabType,
      title: '📝 ' + t.newReflection,
      description: 'Engage in a thoughtful multi-turn conversation to untangle your thoughts.',
      accent: 'border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/30 dark:to-slate-900',
      badge: 'Multi-turn AI',
    },
    {
      id: 'card-problem',
      tab: 'problems' as TabType,
      title: '🧠 ' + t.solveProblem,
      description: 'Deconstruct a real dilemma into root causes, trade-off solutions, and action steps.',
      accent: 'border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/30 dark:to-slate-900',
      badge: 'Adaptive Strategy',
    },
    {
      id: 'card-brainstorm',
      tab: 'brainstorm' as TabType,
      title: '💡 ' + t.brainstormIdeas,
      description: 'Explore creative angles, 10x differentiator hypotheses, and launch blueprints.',
      accent: 'border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/30 dark:to-slate-900',
      badge: 'Multidisciplinary',
    },
    {
      id: 'card-decision',
      tab: 'decisions' as TabType,
      title: '⚖️ ' + t.makeDecision,
      description: 'Compare competing options across time, cost, risk, and long-term value.',
      accent: 'border-cyan-200 dark:border-cyan-900/60 bg-gradient-to-br from-cyan-50/60 to-white dark:from-cyan-950/30 dark:to-slate-900',
      badge: 'Factor Matrix',
    },
    {
      id: 'card-goal',
      tab: 'goals' as TabType,
      title: '🎯 ' + t.workOnGoal,
      description: 'Convert ambitious dreams into structured milestones with SMART tasks.',
      accent: 'border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/30 dark:to-slate-900',
      badge: 'Progress Tracking',
    },
    {
      id: 'card-progress',
      tab: 'insights' as TabType,
      title: '📊 ' + t.reviewProgress,
      description: 'Synthesize daily wins, recurring patterns, and weekly strategic priorities.',
      accent: 'border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/60 to-white dark:from-rose-950/30 dark:to-slate-900',
      badge: 'Deep Review',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Welcome Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{getGreeting()}, {profile?.displayName?.split(' ')[0] || 'Friend'} 👋</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.howCanIHelp}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-dash-voice-input"
            onClick={onOpenVoice}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Voice Reflection</span>
          </button>
        </div>
      </div>

      {/* Proactive Suggestion Banner */}
      {proactiveSuggestion && (
        <ProactiveInsightBanner
          suggestion={proactiveSuggestion}
          onDismiss={handleDismissSuggestion}
          onActionClick={handleActionSuggestion}
        />
      )}

      {/* Main Action Cards Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          What would you like to explore?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actionCards.map((card, i) => (
            <motion.button
              key={card.id}
              id={card.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(card.tab)}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between shadow-xs hover:shadow-md transition-all group ${card.accent}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {card.title}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    {card.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Start now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Goals & Recent Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Goals Card */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              <span>Active Goals</span>
            </h3>
            <button
              id="btn-dash-view-all-goals"
              onClick={() => onNavigate('goals')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All
            </button>
          </div>

          {activeGoals.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <p>No active goals yet.</p>
              <button
                id="btn-dash-add-first-goal"
                onClick={() => onNavigate('goals')}
                className="mt-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                + Create your first goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGoals.slice(0, 3).map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => onNavigate('goals')}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="truncate max-w-[180px]">{goal.title}</span>
                    <span className="text-slate-400">{goal.progressPercentage || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progressPercentage || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Problem Sessions */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-500" />
              <span>Problem Solving</span>
            </h3>
            <button
              id="btn-dash-view-all-problems"
              onClick={() => onNavigate('problems')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              All Sessions
            </button>
          </div>

          {recentProblems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <p>No problem sessions yet.</p>
              <button
                id="btn-dash-add-first-problem"
                onClick={() => onNavigate('problems')}
                className="mt-2 text-amber-600 dark:text-amber-400 font-semibold hover:underline"
              >
                + Solve a new challenge
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentProblems.map((prob) => (
                <div
                  key={prob.id}
                  onClick={() => onNavigate('problems', { problemId: prob.id })}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {prob.title || prob.originalProblem}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                      Status: {prob.status.replace('_', ' ')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Insight & Recent Reflections */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Daily AI Insight</span>
              </h3>
              <button
                id="btn-dash-view-insights"
                onClick={() => onNavigate('insights')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Synthesize Day
              </button>
            </div>
            <div className="p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
              "{dailyInsight}"
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Recent Reflections: <strong>{recentEntries.length}</strong></span>
            <button
              id="btn-dash-open-journal"
              onClick={() => onNavigate('journal')}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Open Journal</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
