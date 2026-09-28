import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  Check, 
  X, 
  Clock, 
  Mic 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { db, collection, doc, setDoc, deleteDoc, onSnapshot, sanitizePayload } from '../firebase';
import { Goal, GoalMilestone, GoalTask } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';

interface GoalsPageProps {
  onOpenVoice: (onConfirmed: (text: string) => void) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({ onOpenVoice }) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useNotification();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Career');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const categories = ['Career', 'Learning', 'Health', 'Finance', 'Personal', 'Mindset'];

  useEffect(() => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'goals');
    const unsub = onSnapshot(ref, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setGoals(list);
    });
    return () => unsub();
  }, [user]);

  const handleCreateGoal = async () => {
    if (!title.trim() || !user) return;

    const newId = 'goal_' + Date.now();
    const newGoal: Goal = {
      id: newId,
      title: title.trim(),
      description: description.trim(),
      category,
      deadline: deadline || '',
      priority,
      progressPercentage: 0,
      completed: false,
      milestones: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'goals', newId), sanitizePayload(newGoal));
      setTitle('');
      setDescription('');
      setDeadline('');
      setIsCreating(false);
      addToast('success', 'Goal Created', 'Now generate AI SMART milestones to break it down.');
    } catch (err: any) {
      addToast('error', 'Could not create goal', err.message);
    }
  };

  const handleBreakdownWithAI = async (goal: Goal) => {
    if (!user || breakingDownId) return;

    setBreakingDownId(goal.id);
    try {
      const res = await api.breakdownGoal(goal.title, goal.description, goal.deadline || '', goal.category, language);

      const updatedGoal: Goal = {
        ...goal,
        milestones: res.milestones || [],
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'goals', goal.id), sanitizePayload(updatedGoal));
      addToast('success', 'Goal Deconstructed', 'Generated actionable SMART milestones.');
    } catch (err: any) {
      console.error('[Goal Breakdown Error]:', err);
      addToast('error', 'Breakdown Failed', err.message);
    } finally {
      setBreakingDownId(null);
    }
  };

  const handleToggleTask = async (goal: Goal, milestoneId: string, taskId: string) => {
    if (!user) return;

    let totalTasks = 0;
    let completedTasks = 0;

    const updatedMilestones = (goal.milestones || []).map((m) => {
      const tasks = (m.tasks || []).map((task) => {
        const isTarget = m.id === milestoneId && task.id === taskId;
        const isDone = isTarget ? !task.completed : task.completed;
        totalTasks += 1;
        if (isDone) completedTasks += 1;
        return isTarget ? { ...task, completed: isDone } : task;
      });
      return { ...m, tasks };
    });

    const newProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : goal.progressPercentage;
    const isNowCompleted = newProgress === 100;

    const updatedGoal: Goal = {
      ...goal,
      milestones: updatedMilestones,
      progressPercentage: newProgress,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    if (isNowCompleted && !goal.completed) {
      try {
        confetti({ particleCount: 60, spread: 60 });
      } catch (e) {}
      addToast('success', 'Goal Completed! 🎯', 'All milestones fulfilled.');
    }

    try {
      await setDoc(doc(db, 'users', user.uid, 'goals', goal.id), sanitizePayload(updatedGoal));
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'goals', goalId));
      addToast('info', 'Goal deleted');
    } catch (err: any) {
      addToast('error', 'Delete failed', err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              SMART Execution
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-7 h-7 text-emerald-500" />
            <span>Goal Management</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Set ambitious targets and let Gemini deconstruct them into sequential SMART milestones with actionable micro-tasks.
          </p>
        </div>

        <button
          id="btn-open-create-goal"
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Creation Modal / Inline Panel */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 backdrop-blur-sm shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Create New Target</span>
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
              Goal Title
            </label>
            <input
              id="input-goal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Land a software engineering internship for summer 2026"
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Deadline (Optional)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
              </input>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description & Success Metrics
              </label>
              <button
                type="button"
                onClick={() => onOpenVoice((text) => setDescription(text))}
                className="text-xs text-rose-500 font-semibold hover:underline flex items-center gap-1"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Input</span>
              </button>
            </div>
            <textarea
              id="textarea-goal-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Complete 50 LeetCode problems, polish resume, apply to 30 companies..."
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
              id="btn-submit-create-goal"
              type="button"
              onClick={handleCreateGoal}
              disabled={!title.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-xs"
            >
              <Target className="w-4 h-4" />
              <span>Create Goal</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="text-center py-16 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Goals Created</h3>
          <p className="text-xs max-w-sm mx-auto mt-1 mb-4">
            Turn your long-term ambitions into structured micro-milestones with automated progress tracking.
          </p>
          <button
            id="btn-goal-empty-create"
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            + Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const hasMilestones = goal.milestones && goal.milestones.length > 0;
            const isBreakingDown = breakingDownId === goal.id;

            return (
              <div
                key={goal.id}
                id={`goal-item-${goal.id}`}
                className={`p-6 rounded-2xl border transition-all ${
                  goal.completed
                    ? 'border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {goal.category}
                      </span>
                      <span
                        className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                          goal.priority === 'High'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                        }`}
                      >
                        {goal.priority} priority
                      </span>
                      {goal.deadline && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>Due {goal.deadline}</span>
                        </span>
                      )}
                    </div>

                    <h3 className={`text-base sm:text-lg font-bold ${goal.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!hasMilestones && !goal.completed && (
                      <button
                        id={`btn-breakdown-goal-${goal.id}`}
                        onClick={() => handleBreakdownWithAI(goal)}
                        disabled={isBreakingDown}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-all shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isBreakingDown ? 'Deconstructing...' : 'AI SMART Breakdown'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{goal.progressPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Milestones & Tasks List */}
                {hasMilestones && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      SMART Milestones & Action Tasks
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {goal.milestones?.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-2"
                        >
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {milestone.title}
                          </div>

                          <div className="space-y-1.5">
                            {milestone.tasks?.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => handleToggleTask(goal, milestone.id, task.id)}
                                className="flex items-start gap-2 cursor-pointer group"
                              >
                                <button className="mt-0.5 shrink-0">
                                  {task.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                                  )}
                                </button>
                                <span className={`text-[11px] ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {task.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
