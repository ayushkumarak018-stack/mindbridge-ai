import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Sparkles, 
  Plus, 
  ArrowRight, 
  Target, 
  Rocket, 
  CheckCircle2, 
  Trash2, 
  Compass, 
  Mic 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { db, collection, doc, setDoc, deleteDoc, onSnapshot, sanitizePayload } from '../firebase';
import { BrainstormSession } from '../types';
import { api } from '../services/api';
import { motion } from 'motion/react';

interface BrainstormPageProps {
  onOpenVoice: (onConfirmed: (text: string) => void) => void;
  onConvertToGoal?: (title: string, desc: string) => void;
}

export const BrainstormPage: React.FC<BrainstormPageProps> = ({ onOpenVoice, onConvertToGoal }) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useNotification();

  const [sessions, setSessions] = useState<BrainstormSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [ideaInput, setIdeaInput] = useState('');
  const [isBrainstorming, setIsBrainstorming] = useState(false);

  useEffect(() => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'brainstorms');
    const unsub = onSnapshot(ref, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BrainstormSession));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessions(list);
      if (list.length > 0 && !selectedSessionId) {
        setSelectedSessionId(list[0].id);
      }
    });
    return () => unsub();
  }, [user]);

  const handleGenerateBrainstorm = async () => {
    if (!ideaInput.trim() || !user || isBrainstorming) return;

    setIsBrainstorming(true);
    try {
      const res = await api.brainstormIdea(ideaInput.trim(), language);

      const newId = 'bs_' + Date.now();
      const newSession: BrainstormSession = {
        id: newId,
        title: res.result.title || ideaInput.substring(0, 30),
        originalIdea: ideaInput.trim(),
        angles: res.result.angles || [],
        keyHighlights: res.result.keyHighlights || [],
        actionPlan: res.result.actionPlan || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'brainstorms', newId), sanitizePayload(newSession));
      setSelectedSessionId(newId);
      setIdeaInput('');
      addToast('success', 'Ideas Expanded!', 'Generated multidimensional angles & action blueprint.');
    } catch (err: any) {
      console.error('[Brainstorm Error]:', err);
      addToast('error', 'Brainstorm failed', err.message);
    } finally {
      setIsBrainstorming(false);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'brainstorms', id));
      addToast('info', 'Brainstorm deleted');
      if (selectedSessionId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        setSelectedSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      addToast('error', 'Delete failed', err.message);
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
            Creative Expansion
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Lightbulb className="w-7 h-7 text-purple-500" />
          <span>AI Brainstorming Mode</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Enter an early idea, project seed, or startup concept. MindBridge expands it into differentiated angles, risk-reward trade-offs, and an actionable execution roadmap.
        </p>
      </div>

      {/* Idea Input Box */}
      <div className="p-5 sm:p-6 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/50 via-white to-indigo-50/30 dark:from-purple-950/30 dark:via-slate-900 dark:to-indigo-950/20 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Enter your idea to brainstorm:
          </label>
          <button
            type="button"
            onClick={() => onOpenVoice((text) => setIdeaInput(text))}
            className="text-xs text-rose-500 font-semibold hover:underline flex items-center gap-1"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Input</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="input-brainstorm-idea"
            type="text"
            value={ideaInput}
            onChange={(e) => setIdeaInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateBrainstorm()}
            placeholder="e.g., I want to build a student productivity app for exam cramming with peer accountability..."
            className="flex-1 px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />

          <button
            id="btn-submit-brainstorm"
            type="button"
            onClick={handleGenerateBrainstorm}
            disabled={!ideaInput.trim() || isBrainstorming}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
          >
            {isBrainstorming ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Expanding Idea...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>Brainstorm Angles</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* History Tabs / Selected Session */}
      {sessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  s.id === selectedSessionId
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{s.title}</span>
                <span
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="hover:text-rose-300 ml-1"
                >
                  ×
                </span>
              </button>
            ))}
          </div>

          {selectedSession && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                  {selectedSession.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-4">
                  Original Seed: "{selectedSession.originalIdea}"
                </p>

                {selectedSession.keyHighlights && selectedSession.keyHighlights.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {selectedSession.keyHighlights.map((h, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/60 text-purple-800 dark:text-purple-300 text-xs font-medium"
                      >
                        ✦ {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Angles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedSession.angles?.map((angle, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                        {angle.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 mb-2">
                        {angle.title}
                      </h4>

                      <div className="space-y-2 text-xs">
                        <div>
                          <strong className="text-slate-700 dark:text-slate-300 block mb-1">Ideas:</strong>
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            {angle.ideas?.map((idea, i) => (
                              <li key={i}>{idea}</li>
                            ))}
                          </ul>
                        </div>

                        {angle.opportunities && angle.opportunities.length > 0 && (
                          <div className="pt-2">
                            <strong className="text-emerald-700 dark:text-emerald-400 block mb-1">Opportunities:</strong>
                            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                              {angle.opportunities.map((op, i) => (
                                <li key={i}>{op}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {angle.nextSteps && angle.nextSteps.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        <strong>First Experiment:</strong> {angle.nextSteps[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Plan Blueprint */}
              {selectedSession.actionPlan && selectedSession.actionPlan.length > 0 && (
                <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 mb-3 flex items-center gap-1.5">
                    <Rocket className="w-4 h-4 text-indigo-600" />
                    <span>Suggested Action Blueprint</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedSession.actionPlan.map((plan, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span>{plan}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
