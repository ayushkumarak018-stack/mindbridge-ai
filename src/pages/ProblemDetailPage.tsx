import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Compass, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Flame, 
  Clock, 
  Send, 
  Mic, 
  Trophy, 
  Award, 
  Zap, 
  ChevronDown, 
  Check, 
  RotateCcw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { db, doc, setDoc, sanitizePayload } from '../firebase';
import { ProblemSession, SolutionOption, ActionStep, ProblemUpdate, ProblemResolution } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';

interface ProblemDetailPageProps {
  problem: ProblemSession;
  onBack: () => void;
  onOpenVoice: (onConfirmed: (text: string) => void) => void;
}

export const ProblemDetailPage: React.FC<ProblemDetailPageProps> = ({
  problem,
  onBack,
  onOpenVoice,
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useNotification();

  const [activeSolutionId, setActiveSolutionId] = useState<string>(
    problem.selectedSolutionId || problem.recommendedSolutionId || (problem.solutions?.[0]?.id || 'sol_1')
  );
  const [updateText, setUpdateText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const selectedSolution = problem.solutions?.find((s) => s.id === activeSolutionId) || problem.solutions?.[0];

  // Toggle Action Step Completion
  const handleToggleStep = async (stepId: string) => {
    if (!user) return;
    const updatedPlan = (problem.actionPlan || []).map((step) => {
      if (step.id === stepId) {
        return {
          ...step,
          completed: !step.completed,
          completedAt: !step.completed ? new Date().toISOString() : undefined,
        };
      }
      return step;
    });

    const updatedSession: ProblemSession = {
      ...problem,
      actionPlan: updatedPlan,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'problemSessions', problem.id), sanitizePayload(updatedSession));
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  // Switch Active Strategy
  const handleSelectSolution = async (solId: string) => {
    if (!user) return;
    setActiveSolutionId(solId);
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'problemSessions', problem.id),
        { selectedSolutionId: solId, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      addToast('success', 'Strategy Activated', 'Focus set to this solution.');
    } catch (err) {}
  };

  // Submit Live Progress Update to Gemini
  const handleSendUpdate = async (textToSend?: string) => {
    const text = (textToSend || updateText).trim();
    if (!text || !user || isUpdating) return;

    setIsUpdating(true);
    try {
      const res = await api.updateProblem(problem, text, language);

      const newUpdate: ProblemUpdate = {
        id: 'upd_' + Date.now(),
        timestamp: new Date().toISOString(),
        userNote: text,
        aiResponse: res.result.aiResponse,
        strategyAdjustment: res.result.strategyAdjustment,
      };

      const updatedSession: ProblemSession = {
        ...problem,
        actionPlan: res.result.updatedActionPlan && res.result.updatedActionPlan.length > 0 ? res.result.updatedActionPlan : problem.actionPlan,
        updates: [...(problem.updates || []), newUpdate],
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'problemSessions', problem.id), sanitizePayload(updatedSession));
      setUpdateText('');
      addToast('success', 'Strategy Adapted', 'MindBridge adjusted the execution roadmap.');
    } catch (err: any) {
      console.error('[Problem Update Error]:', err);
      addToast('error', 'Update failed', err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Mark Problem as Solved & Generate Resolution Summary
  const handleMarkAsSolved = async () => {
    if (!user || isResolving) return;

    setIsResolving(true);
    try {
      const res = await api.resolveProblem(problem, language);

      const updatedSession: ProblemSession = {
        ...problem,
        status: 'solved',
        resolution: res.resolution,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'problemSessions', problem.id), sanitizePayload(updatedSession));

      // Trigger Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      addToast('success', 'Problem Solved! 🎉', 'Generated comprehensive Problem Resolution Summary.');
    } catch (err: any) {
      console.error('[Problem Resolve Error]:', err);
      addToast('error', 'Resolution summary failed', err.message);
    } finally {
      setIsResolving(false);
    }
  };

  const isSolved = problem.status === 'solved';
  const completedStepsCount = problem.actionPlan?.filter((s) => s.completed).length || 0;
  const totalStepsCount = problem.actionPlan?.length || 0;
  const progressPercent = totalStepsCount > 0 ? Math.round((completedStepsCount / totalStepsCount) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          id="btn-back-to-problem-list"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Problems</span>
        </button>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isSolved
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
            }`}
          >
            {isSolved ? 'Resolved ✓' : 'Active Strategy'}
          </span>

          {!isSolved && (
            <button
              id="btn-mark-problem-solved"
              onClick={handleMarkAsSolved}
              disabled={isResolving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isResolving ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Resolution...</span>
                </>
              ) : (
                <>
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Mark as Solved</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Problem Header Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5">
          <span className="uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">{problem.category}</span>
          <span>•</span>
          <span>{new Date(problem.createdAt).toLocaleDateString()}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-3">
          {problem.title}
        </h1>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
          "{problem.originalProblem}"
        </div>
      </div>

      {/* Resolution Summary Banner if Solved */}
      {problem.resolution && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/40 dark:to-slate-900 shadow-md"
        >
          <div className="flex items-center gap-2.5 mb-4 text-emerald-800 dark:text-emerald-300">
            <Award className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-base">Problem Resolution Summary</h3>
              <p className="text-xs opacity-90">Completed and synthesized on {new Date(problem.resolution.resolvedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/50">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 mb-2">What Worked</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                {problem.resolution.whatWorked.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/50">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 mb-2">Lessons Learned</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                {problem.resolution.lessonsLearned.map((l, idx) => (
                  <li key={idx}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-emerald-100/50 dark:bg-emerald-950/60 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
            <strong>Final Solution:</strong> {problem.resolution.finalSolution}
          </div>
        </motion.div>
      )}

      {/* 1. Deep Problem Analysis */}
      {problem.analysis && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            1. Root Cause & Control Dynamics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Within Control */}
            <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
              <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Within Your Direct Control (Focus Here)</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {problem.analysis.inUserControl.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Outside Control */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Outside Your Direct Control (Acknowledge & Release)</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                {problem.analysis.outsideUserControl.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 2. Solutions Comparison */}
      {problem.solutions && problem.solutions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              2. Solution Pathways
            </h2>
            <span className="text-xs text-slate-400">
              Select a solution to activate its execution roadmap
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {problem.solutions.map((sol) => {
              const isSelected = sol.id === activeSolutionId;
              const isRecommended = sol.id === problem.recommendedSolutionId;

              return (
                <button
                  key={sol.id}
                  id={`btn-select-solution-${sol.id}`}
                  onClick={() => handleSelectSolution(sol.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {sol.difficulty}
                    </span>
                    {isRecommended && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        AI Recommended
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                    {sol.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {sol.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Solution Detailed Breakdown */}
          {selectedSolution && (
            <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    {selectedSolution.title}
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                    Expected in 1-2 weeks: {selectedSolution.expectedResult}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedSolution.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <h5 className="font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">Advantages</h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    {selectedSolution.advantages.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">Disadvantages</h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                    {selectedSolution.disadvantages.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                  <h5 className="font-bold text-rose-800 dark:text-rose-300 mb-1.5">Risks</h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    {selectedSolution.risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Action Plan Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              3. Execution Action Blueprint
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Check off action items as you complete them
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {progressPercent}% Complete
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {(problem.actionPlan || []).map((step, idx) => (
            <div
              key={step.id}
              onClick={() => handleToggleStep(step.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                step.completed
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'
              }`}
            >
              <button
                id={`btn-toggle-step-${step.id}`}
                className="mt-0.5 shrink-0"
              >
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400 hover:text-indigo-500" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-xs sm:text-sm font-bold ${
                      step.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    Step {idx + 1}: {step.title}
                  </h4>
                  {step.completedAt && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Done {new Date(step.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Live Updates & Adaptive Context (Section 5) */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-indigo-500" />
          <span>4. Live Progress Updates & Adaptive AI Follow-up</span>
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Tried a step? Teammate disagreed? New obstacle? Update the AI and let MindBridge adjust your strategy while retaining all prior context.
        </p>

        {/* Updates History */}
        {(problem.updates || []).length > 0 && (
          <div className="space-y-3">
            {problem.updates?.map((upd) => (
              <div
                key={upd.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-2"
              >
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    User Progress Update
                  </span>
                  <span>{new Date(upd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-medium italic">
                  "{upd.userNote}"
                </p>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">MindBridge Adaptation:</span>
                  {upd.aiResponse}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Update Submission Box */}
        {!isSolved && (
          <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                What happened next? (Describe outcomes or new blockers)
              </label>
              <button
                type="button"
                onClick={() => onOpenVoice((text) => setUpdateText(text))}
                className="text-xs text-rose-500 font-semibold hover:underline flex items-center gap-1"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Update</span>
              </button>
            </div>

            <textarea
              id="textarea-problem-update"
              rows={3}
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              placeholder="e.g., I tried the collaborative message approach, but they only partially agreed. What should I say next?"
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />

            <div className="flex justify-end">
              <button
                id="btn-submit-problem-update"
                type="button"
                onClick={() => handleSendUpdate()}
                disabled={!updateText.trim() || isUpdating}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all"
              >
                {isUpdating ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Adjusting Strategy...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Progress Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
