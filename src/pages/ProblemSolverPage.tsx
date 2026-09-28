import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Plus, 
  Compass, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  Filter, 
  Trash2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  sanitizePayload 
} from '../firebase';
import { ProblemSession, AIMemory } from '../types';
import { api } from '../services/api';
import { ProblemDetailPage } from './ProblemDetailPage';
import { motion } from 'motion/react';

interface ProblemSolverPageProps {
  initialProblemId?: string;
  onOpenVoice: (onConfirmed: (text: string) => void) => void;
}

export const ProblemSolverPage: React.FC<ProblemSolverPageProps> = ({ initialProblemId, onOpenVoice }) => {
  const { user, profile } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useNotification();

  const [problems, setProblems] = useState<ProblemSession[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(initialProblemId || null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userMemories, setUserMemories] = useState<AIMemory[]>([]);

  // New problem form state
  const [problemDescription, setProblemDescription] = useState('');
  const [category, setCategory] = useState('Career & Work');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'solved'>('all');

  const categories = ['Career & Work', 'Academics & College', 'Communication & Team', 'Personal Habits', 'Decision Dilemma', 'General'];

  const examplePrompts = [
    'I have an important project deadline, but my teammate is not cooperating.',
    'I feel overwhelmed trying to balance college exams with internship applications.',
    'I need to have a difficult feedback conversation with a colleague without causing friction.',
  ];

  useEffect(() => {
    if (!user) return;

    const memRef = collection(db, 'users', user.uid, 'memories');
    const unsubMem = onSnapshot(memRef, (snap) => {
      setUserMemories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AIMemory)));
    });

    const problemsRef = collection(db, 'users', user.uid, 'problemSessions');
    const unsubProblems = onSnapshot(problemsRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProblemSession));
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setProblems(list);
    });

    return () => {
      unsubMem();
      unsubProblems();
    };
  }, [user]);

  const handleStartAnalysis = async () => {
    if (!problemDescription.trim() || !user || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const relevantMemories = profile?.memoryEnabled ? userMemories : [];
      const res = await api.solveProblem(problemDescription.trim(), category, language, relevantMemories);

      const newId = 'prob_' + Date.now();
      const newProblemSession: ProblemSession = {
        id: newId,
        title: res.result.title || problemDescription.substring(0, 30),
        category,
        status: 'in_progress',
        originalProblem: problemDescription.trim(),
        analysis: res.result.analysis,
        solutions: res.result.solutions || [],
        recommendedSolutionId: res.result.recommendedSolutionId || 'sol_1',
        selectedSolutionId: res.result.recommendedSolutionId || 'sol_1',
        actionPlan: res.result.actionPlan || [],
        updates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'problemSessions', newId), sanitizePayload(newProblemSession));

      // Save problem to AI memory if enabled
      if (profile?.memoryEnabled) {
        const memId = 'mem_prob_' + Date.now();
        const mem: AIMemory = {
          id: memId,
          keyTopic: newProblemSession.title,
          content: `Active problem: ${problemDescription.trim()}`,
          category: 'Problem',
          sourceType: 'problem',
          sourceId: newId,
          timestamp: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', user.uid, 'memories', memId), sanitizePayload(mem));
      }

      setProblemDescription('');
      setIsCreating(false);
      setSelectedProblemId(newId);
      addToast('success', 'Problem Analyzed', 'Solutions and action blueprint generated.');
    } catch (err: any) {
      console.error('[Problem Solver Error]:', err);
      addToast('error', 'Analysis Failed', err.message || 'Could not analyze problem. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteProblem = async (problemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'problemSessions', problemId));
      addToast('info', 'Problem Session Deleted');
      if (selectedProblemId === problemId) {
        setSelectedProblemId(null);
      }
    } catch (err: any) {
      addToast('error', 'Error deleting', err.message);
    }
  };

  // If a problem detail is selected, render the dedicated Detail/Live Update view
  const selectedProblem = problems.find((p) => p.id === selectedProblemId);
  if (selectedProblem) {
    return (
      <ProblemDetailPage
        problem={selectedProblem}
        onBack={() => setSelectedProblemId(null)}
        onOpenVoice={onOpenVoice}
      />
    );
  }

  const filteredProblems = problems.filter((p) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'solved') return p.status === 'solved';
    return p.status !== 'solved';
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              Live Adaptive Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Compass className="w-7 h-7 text-amber-500" />
            <span>Real-Time Problem Solver</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Describe any real-world challenge. Deconstruct root causes, compare actionable solution pathways, and execute adaptive live updates until resolution.
          </p>
        </div>

        <button
          id="btn-open-create-problem"
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold text-xs shadow-md shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Solve a New Problem</span>
        </button>
      </div>

      {/* Creation Modal / Inline Panel */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 backdrop-blur-sm shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Describe Your Challenge</span>
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      category === cat
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  What is happening? (Include what you tried and what is blocking you)
                </label>
                <button
                  type="button"
                  onClick={() => onOpenVoice((text) => setProblemDescription(text))}
                  className="text-xs text-rose-500 font-semibold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Voice Dictation</span>
                </button>
              </div>
              <textarea
                id="textarea-problem-description"
                rows={4}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="e.g., I have an important college project due in 5 days, but my team isn't answering messages and I am carrying all the work..."
                className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>

            {/* Example Prompt Chips */}
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Quick examples:</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {examplePrompts.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProblemDescription(ex)}
                    className="text-[11px] text-left p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-amber-100 dark:border-amber-900/40 text-slate-600 dark:text-slate-300 hover:border-amber-300 transition-colors"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                id="btn-submit-problem-analysis"
                type="button"
                onClick={handleStartAnalysis}
                disabled={!problemDescription.trim() || isAnalyzing}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Analyzing Problem Dynamics...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4" />
                    <span>Deconstruct & Generate Solutions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-medium">
        <button
          id="btn-filter-all-problems"
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            filterStatus === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Sessions ({problems.length})
        </button>
        <button
          id="btn-filter-active-problems"
          onClick={() => setFilterStatus('in_progress')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            filterStatus === 'in_progress'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          In Progress ({problems.filter((p) => p.status !== 'solved').length})
        </button>
        <button
          id="btn-filter-solved-problems"
          onClick={() => setFilterStatus('solved')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            filterStatus === 'solved'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Resolved ({problems.filter((p) => p.status === 'solved').length})
        </button>
      </div>

      {/* Problems Grid */}
      {filteredProblems.length === 0 ? (
        <div className="text-center py-16 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
          <Compass className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Problem Sessions</h3>
          <p className="text-xs max-w-sm mx-auto mt-1 mb-4">
            When obstacles arise in your projects, career, or daily life, let MindBridge deconstruct them into clear options.
          </p>
          <button
            id="btn-problem-empty-state"
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs"
          >
            + Start Problem Analysis
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProblems.map((problem) => {
            const isSolved = problem.status === 'solved';
            const completedSteps = problem.actionPlan?.filter((s) => s.completed).length || 0;
            const totalSteps = problem.actionPlan?.length || 0;

            return (
              <motion.div
                key={problem.id}
                id={`problem-card-${problem.id}`}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedProblemId(problem.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSolved
                    ? 'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 hover:border-amber-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {problem.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isSolved
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {isSolved ? 'Solved' : 'Active Strategy'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-1">
                    {problem.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    "{problem.originalProblem}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{completedSteps}/{totalSteps} steps</span>
                    </span>
                    <span>•</span>
                    <span>{problem.updates?.length || 0} updates</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-delete-problem-${problem.id}`}
                      onClick={(e) => handleDeleteProblem(problem.id, e)}
                      title="Delete Problem Session"
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
