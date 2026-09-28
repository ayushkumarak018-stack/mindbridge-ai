import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Mic, 
  BrainCircuit, 
  Award 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { db, collection, doc, setDoc, deleteDoc, onSnapshot, sanitizePayload } from '../firebase';
import { DecisionSession, DecisionFactor, OptionDetail } from '../types';
import { api } from '../services/api';
import { motion } from 'motion/react';

interface DecisionPageProps {
  onOpenVoice: (onConfirmed: (text: string) => void) => void;
}

export const DecisionPage: React.FC<DecisionPageProps> = ({ onOpenVoice }) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useNotification();

  const [sessions, setSessions] = useState<DecisionSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [decisionTitle, setDecisionTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [context, setContext] = useState('');

  useEffect(() => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'decisions');
    const unsub = onSnapshot(ref, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DecisionSession));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessions(list);
      if (list.length > 0 && !selectedSessionId) {
        setSelectedSessionId(list[0].id);
      }
    });
    return () => unsub();
  }, [user]);

  const handleAddOptionField = () => {
    if (options.length < 4) {
      setOptions([...options, `Option ${options.length + 1}`]);
    }
  };

  const handleRemoveOptionField = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleUpdateOptionText = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleEvaluateDecision = async () => {
    if (!decisionTitle.trim() || options.some((o) => !o.trim()) || !user || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const res = await api.analyzeDecision(
        decisionTitle.trim(),
        decisionTitle.trim(),
        options.map((name, i) => ({ id: `opt_${i}`, name })),
        context,
        language
      );

      const newId = 'dec_' + Date.now();
      const newSession: DecisionSession = {
        id: newId,
        title: decisionTitle.trim(),
        dilemma: decisionTitle.trim(),
        options: res.options || options.map((name, i) => ({ id: `opt_${i}`, name, pros: [], cons: [] })),
        factors: res.factors || [],
        tradeOffs: res.tradeOffs || [],
        recommendation: res.recommendation || '',
        reflectiveQuestions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'decisions', newId), sanitizePayload(newSession));
      setSelectedSessionId(newId);
      setIsCreating(false);
      setDecisionTitle('');
      setContext('');
      setOptions(['Option 1', 'Option 2']);
      addToast('success', 'Decision Analyzed', 'Trade-off factor matrix generated.');
    } catch (err: any) {
      console.error('[Decision Error]:', err);
      addToast('error', 'Evaluation Failed', err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'decisions', id));
      addToast('info', 'Decision deleted');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
              Factor Matrix & Trade-offs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Scale className="w-7 h-7 text-cyan-500" />
            <span>Decision Assistant</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Evaluate high-stakes personal or professional dilemmas through side-by-side trade-off comparisons across cost, time, long-term impact, and risk.
          </p>
        </div>

        <button
          id="btn-open-create-decision"
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-semibold text-xs shadow-md shadow-cyan-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Decision Analysis</span>
        </button>
      </div>

      {/* Creation Modal / Inline Panel */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/40 dark:bg-cyan-950/20 backdrop-blur-sm shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>Define the Dilemma</span>
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              What decision are you trying to make?
            </label>
            <input
              id="input-decision-title"
              type="text"
              value={decisionTitle}
              onChange={(e) => setDecisionTitle(e.target.value)}
              placeholder="e.g., Should I take the new job offer or stay at my current role?"
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Competing Options:
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleUpdateOptionText(idx, e.target.value)}
                    placeholder={`Option ${idx + 1} description`}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionField(idx)}
                      className="p-2 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 4 && (
              <button
                type="button"
                onClick={handleAddOptionField}
                className="mt-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add another option</span>
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Additional context or personal constraints (Optional):
              </label>
              <button
                type="button"
                onClick={() => onOpenVoice((text) => setContext(text))}
                className="text-xs text-rose-500 font-semibold hover:underline flex items-center gap-1"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Dictation</span>
              </button>
            </div>
            <textarea
              id="textarea-decision-context"
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Salary is 20% higher at the new job, but current company offers flexible remote work and stability..."
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              id="btn-submit-decision-analysis"
              type="button"
              onClick={handleEvaluateDecision}
              disabled={!decisionTitle.trim() || options.some((o) => !o.trim()) || isEvaluating}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all"
            >
              {isEvaluating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Evaluating Matrix & Trade-offs...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Analyze Options</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Decision Sessions Display */}
      {sessions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  s.id === selectedSessionId
                    ? 'bg-cyan-600 text-white shadow-xs'
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
              {/* Recommendation Banner */}
              {selectedSession.recommendation && (
                <div className="p-5 rounded-2xl border border-cyan-300 dark:border-cyan-800/80 bg-gradient-to-r from-cyan-50/80 to-white dark:from-cyan-950/40 dark:to-slate-900 shadow-xs">
                  <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 font-bold uppercase tracking-wider text-xs mb-1.5">
                    <Award className="w-4 h-4 text-cyan-600" />
                    <span>MindBridge Strategic Recommendation</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {selectedSession.recommendation}
                  </p>
                </div>
              )}

              {/* Factors Comparison Matrix Table */}
              {selectedSession.factors && selectedSession.factors.length > 0 && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-x-auto">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
                    Factor Comparison Matrix
                  </h3>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 pr-4 font-bold">Factor</th>
                        {selectedSession.options.map((opt) => (
                          <th key={opt.id} className="py-2.5 px-4 font-bold text-slate-700 dark:text-slate-200">
                            {opt.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedSession.factors.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">
                            {f.factorName}
                          </td>
                          {selectedSession.options.map((opt) => (
                            <td key={opt.id} className="py-3 px-4 leading-relaxed">
                              {f.scores?.[opt.name] || f.scores?.[opt.id] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pros & Cons Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedSession.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4"
                  >
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
                      {opt.name}
                    </h4>

                    {opt.pros && opt.pros.length > 0 && (
                      <div className="space-y-1 text-xs">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pros
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                          {opt.pros.map((p, idx) => (
                            <li key={idx}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {opt.cons && opt.cons.length > 0 && (
                      <div className="space-y-1 text-xs">
                        <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Cons & Risks
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                          {opt.cons.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reflective Questions */}
              {selectedSession.reflectiveQuestions && selectedSession.reflectiveQuestions.length > 0 && (
                <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 text-xs space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    <span>Questions to Clarify Your Final Choice</span>
                  </h4>
                  <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                    {selectedSession.reflectiveQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">?</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
