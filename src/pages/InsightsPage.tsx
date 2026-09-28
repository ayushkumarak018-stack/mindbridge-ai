import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  Award, 
  AlertCircle, 
  Lightbulb, 
  RefreshCw, 
  BarChart3, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { db, collection, getDocs, doc, setDoc, onSnapshot, sanitizePayload } from '../firebase';
import { DailyInsight, WeeklyInsight, JournalEntry, ProblemSession, Goal } from '../types';
import { api } from '../services/api';
import { motion } from 'motion/react';

export const InsightsPage: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [dailyInsights, setDailyInsights] = useState<DailyInsight[]>([]);
  const [weeklyInsights, setWeeklyInsights] = useState<WeeklyInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const dailyRef = collection(db, 'users', user.uid, 'dailyInsights');
    const unsubDaily = onSnapshot(dailyRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyInsight));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDailyInsights(list);
    });

    const weeklyRef = collection(db, 'users', user.uid, 'weeklyInsights');
    const unsubWeekly = onSnapshot(weeklyRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WeeklyInsight));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWeeklyInsights(list);
    });

    return () => {
      unsubDaily();
      unsubWeekly();
    };
  }, [user]);

  const handleSynthesizeDaily = async () => {
    if (!user || isGenerating) return;

    setIsGenerating(true);
    try {
      // Gather user's recent reflections & problems
      const journalSnap = await getDocs(collection(db, 'users', user.uid, 'journalEntries'));
      const problemSnap = await getDocs(collection(db, 'users', user.uid, 'problemSessions'));

      const journalEntries = journalSnap.docs.map((d) => d.data() as JournalEntry);
      const problemSessions = problemSnap.docs.map((d) => d.data() as ProblemSession);

      const recentTexts = [
        ...journalEntries.flatMap((j) => (j.messages || []).map((m) => m.content)),
        ...problemSessions.map((p) => p.originalProblem),
      ];

      const contentToAnalyze = recentTexts.slice(0, 8) || ['Completed reflection and planning today.'];

      const res = await api.generateDailyInsight(contentToAnalyze, new Date().toISOString().split('T')[0]);

      const todayStr = new Date().toISOString().split('T')[0];
      const newDaily: DailyInsight = {
        id: 'daily_' + todayStr,
        date: todayStr,
        theme: res.theme || 'Daily Synthesis',
        keyReflection: res.keyReflection || res.overallReflection || 'Consistent momentum on core goals.',
        emotionalTone: res.emotionalTone || 'Focused',
        wins: res.wins || res.dailyWins || res.progressMade || [],
        growthOpportunity: res.growthOpportunity || (res.problemsEncountered ? res.problemsEncountered[0] : 'Refine routines'),
        actionPrompt: res.actionPrompt || (res.tomorrowPriorities ? res.tomorrowPriorities[0] : 'Continue consistent daily execution'),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'dailyInsights', newDaily.id), sanitizePayload(newDaily));
      addToast('success', 'Daily Synthesis Complete', 'Insights and recurring patterns analyzed.');
    } catch (err: any) {
      console.error('[Daily Synthesis Error]:', err);
      addToast('error', 'Synthesis Failed', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWeeklyReview = async () => {
    if (!user || isGenerating) return;

    setIsGenerating(true);
    try {
      const journalSnap = await getDocs(collection(db, 'users', user.uid, 'journalEntries'));
      const problemSnap = await getDocs(collection(db, 'users', user.uid, 'problemSessions'));
      const goalSnap = await getDocs(collection(db, 'users', user.uid, 'goals'));

      const journalEntries = journalSnap.docs.map((d) => d.data() as JournalEntry);
      const problemSessions = problemSnap.docs.map((d) => d.data() as ProblemSession);
      const goals = goalSnap.docs.map((d) => d.data() as Goal);

      const reflectionsText = journalEntries.flatMap((j) => (j.messages || []).map((m) => m.content)).slice(0, 10).join('\n');
      const problemsText = problemSessions.map((p) => `${p.title}: ${p.status}`).join('\n');
      const goalsText = goals.map((g) => `${g.title} (${g.progressPercentage}% done)`).join('\n');

      const weeklyData = {
        reflectionsText,
        problemsText,
        goalsText,
      };

      const res = await api.generateWeeklyReview(weeklyData);

      const weekId = 'weekly_' + Date.now();
      const newWeekly: WeeklyInsight = {
        id: weekId,
        weekRange: 'Past 7 Days Review',
        summary: res.summary || 'Strong continuous progress across goals and problem resolution.',
        topAccomplishments: res.topAccomplishments || res.accomplishments || [],
        recurringChallenges: res.recurringChallenges || res.challenges || [],
        mindsetPatterns: res.mindsetPatterns || res.recurringPatterns || [],
        nextWeekPriorities: res.nextWeekPriorities || res.suggestedPriorities || [],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'weeklyInsights', weekId), sanitizePayload(newWeekly));
      addToast('success', 'Weekly Review Generated', 'Comprehensive strategic retrospective ready.');
    } catch (err: any) {
      console.error('[Weekly Review Error]:', err);
      addToast('error', 'Weekly Review Failed', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
              Pattern Recognition
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-rose-500" />
            <span>Personal AI Insights</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Synthesize daily thoughts, track recurring behavioral patterns, and generate actionable weekly retrospectives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'daily' ? (
            <button
              id="btn-trigger-daily-insight"
              onClick={handleSynthesizeDaily}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Synthesizing...' : 'Synthesize Today'}</span>
            </button>
          ) : (
            <button
              id="btn-trigger-weekly-review"
              onClick={handleGenerateWeeklyReview}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all"
            >
              <BarChart3 className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Generating...' : 'Generate 7-Day Review'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-medium">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'daily'
              ? 'bg-rose-600 text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Daily Reflections ({dailyInsights.length})
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'weekly'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Weekly Retrospectives ({weeklyInsights.length})
        </button>
      </div>

      {/* Daily Insights Stream */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {dailyInsights.length === 0 ? (
            <div className="text-center py-16 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Daily Syntheses Yet</h3>
              <p className="text-xs max-w-sm mx-auto mt-1 mb-4">
                Click 'Synthesize Today' to analyze your journal entries, solved problems, and active goals.
              </p>
              <button
                id="btn-daily-empty-action"
                onClick={handleSynthesizeDaily}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                + Synthesize Today's Insights
              </button>
            </div>
          ) : (
            dailyInsights.map((insight) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                      {insight.theme || 'Daily Insight'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Tone: <strong className="text-slate-600 dark:text-slate-300">{insight.emotionalTone}</strong>
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{insight.date}</span>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  "{insight.keyReflection}"
                </div>

                {insight.wins && insight.wins.length > 0 && (
                  <div className="text-xs">
                    <h5 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1.5">
                      <Award className="w-3.5 h-3.5" /> Key Wins & Breakthroughs
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                      {insight.wins.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300 block mb-1">Growth Opportunity:</strong>
                    <p className="text-slate-600 dark:text-slate-400">{insight.growthOpportunity}</p>
                  </div>
                  <div>
                    <strong className="text-indigo-600 dark:text-indigo-400 block mb-1">Tomorrow's Action Prompt:</strong>
                    <p className="text-slate-600 dark:text-slate-400">{insight.actionPrompt}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Weekly Retrospectives Stream */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          {weeklyInsights.length === 0 ? (
            <div className="text-center py-16 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Weekly Retrospectives</h3>
              <p className="text-xs max-w-sm mx-auto mt-1 mb-4">
                Generate a 7-day retrospective reviewing accomplishments, mindset patterns, and strategic priorities.
              </p>
              <button
                id="btn-weekly-empty-action"
                onClick={handleGenerateWeeklyReview}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
              >
                + Generate Weekly Review
              </button>
            </div>
          ) : (
            weeklyInsights.map((rev) => (
              <div
                key={rev.id}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    <span>{rev.weekRange}</span>
                  </h3>
                  <span className="text-xs text-slate-400">{new Date(rev.createdAt).toLocaleDateString()}</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {rev.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                    <h5 className="font-bold text-emerald-800 dark:text-emerald-300 mb-2">Top Accomplishments</h5>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      {rev.topAccomplishments?.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                    <h5 className="font-bold text-amber-800 dark:text-amber-300 mb-2">Recurring Challenges</h5>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      {rev.recurringChallenges?.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                  <h5 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2">Next Week's Strategic Priorities</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rev.nextWeekPriorities?.map((p, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800 font-medium text-slate-800 dark:text-slate-200">
                        {i + 1}. {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
