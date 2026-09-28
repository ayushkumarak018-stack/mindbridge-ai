import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Trash2, 
  Download, 
  Sparkles, 
  BrainCircuit, 
  Lock, 
  AlertTriangle, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  RefreshCw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  sanitizePayload 
} from '../firebase';
import { AIMemory } from '../types';
import { motion } from 'motion/react';

interface MemoryPrivacyPageProps {
  onOpenThreatModal: () => void;
}

export const MemoryPrivacyPage: React.FC<MemoryPrivacyPageProps> = ({ onOpenThreatModal }) => {
  const { user, profile, updateProfileSettings, signOut } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useNotification();

  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAccountResetConfirm, setShowAccountResetConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;

    const memRef = collection(db, 'users', user.uid, 'memories');
    const unsub = onSnapshot(memRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AIMemory));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setMemories(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleDeleteMemory = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'memories', id));
      addToast('info', 'Memory Removed', 'AI will no longer use this context.');
    } catch (err: any) {
      addToast('error', 'Could not delete memory', err.message);
    }
  };

  const handleClearAllMemories = async () => {
    if (!user) return;
    try {
      const snap = await getDocs(collection(db, 'users', user.uid, 'memories'));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      setShowClearConfirm(false);
      addToast('success', 'All Memories Cleared', 'Your AI context memory is now completely blank.');
    } catch (err: any) {
      addToast('error', 'Error clearing memories', err.message);
    }
  };

  const handleToggleMemory = async () => {
    const newVal = !(profile?.memoryEnabled ?? true);
    await updateProfileSettings({ memoryEnabled: newVal });
    addToast('info', newVal ? 'AI Memory Enabled' : 'AI Memory Paused', 'Updated preference.');
  };

  const handleToggleProactive = async () => {
    const newVal = !(profile?.proactiveInsightsEnabled ?? true);
    await updateProfileSettings({ proactiveInsightsEnabled: newVal });
    addToast('info', newVal ? 'Proactive Insights Enabled' : 'Proactive Insights Paused', 'Updated preference.');
  };

  const handleExportAllData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const [jSnap, pSnap, gSnap, dSnap, bSnap, mSnap, dISnap, wISnap] = await Promise.all([
        getDocs(collection(db, 'users', user.uid, 'journalEntries')),
        getDocs(collection(db, 'users', user.uid, 'problemSessions')),
        getDocs(collection(db, 'users', user.uid, 'goals')),
        getDocs(collection(db, 'users', user.uid, 'decisions')),
        getDocs(collection(db, 'users', user.uid, 'brainstorms')),
        getDocs(collection(db, 'users', user.uid, 'memories')),
        getDocs(collection(db, 'users', user.uid, 'dailyInsights')),
        getDocs(collection(db, 'users', user.uid, 'weeklyInsights')),
      ]);

      const exportObject = {
        exportedAt: new Date().toISOString(),
        userId: user.uid,
        email: user.email,
        profile,
        data: {
          journalEntries: jSnap.docs.map((d) => d.data()),
          problemSessions: pSnap.docs.map((d) => d.data()),
          goals: gSnap.docs.map((d) => d.data()),
          decisions: dSnap.docs.map((d) => d.data()),
          brainstorms: bSnap.docs.map((d) => d.data()),
          memories: mSnap.docs.map((d) => d.data()),
          dailyInsights: dISnap.docs.map((d) => d.data()),
          weeklyInsights: wISnap.docs.map((d) => d.data()),
        },
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `mindbridge_data_export_${user.uid.substring(0, 6)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      addToast('success', 'Data Export Complete', 'Downloaded full JSON backup.');
    } catch (err: any) {
      console.error('[Export Error]:', err);
      addToast('error', 'Export Failed', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFullAccountReset = async () => {
    if (!user) return;
    try {
      const collectionsToWipe = [
        'journalEntries', 'problemSessions', 'goals', 'decisions', 
        'brainstorms', 'memories', 'dailyInsights', 'weeklyInsights'
      ];

      for (const colName of collectionsToWipe) {
        const snap = await getDocs(collection(db, 'users', user.uid, colName));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      await deleteDoc(doc(db, 'users', user.uid));
      setShowAccountResetConfirm(false);
      addToast('info', 'Account Reset', 'All data was wiped successfully.');
      signOut();
    } catch (err: any) {
      addToast('error', 'Reset Failed', err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
              User Sovereignty & Security
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-7 h-7 text-cyan-500" />
            <span>AI Memory & Privacy Controls</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            You maintain full ownership over your reflections, problem data, and AI context memories. Inspect, pause, or wipe anytime.
          </p>
        </div>

        <button
          id="btn-open-threat-model-privacy"
          onClick={onOpenThreatModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-fit"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>Inspect Threat Model</span>
        </button>
      </div>

      {/* Privacy Toggles Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
          Preferences & Context Controls
        </h3>

        <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center justify-between pt-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                AI Cross-Session Memory
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Allows MindBridge to remember key recurring goals and challenges during new reflections.
              </p>
            </div>
            <button
              id="btn-toggle-memory"
              onClick={handleToggleMemory}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                profile?.memoryEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  profile?.memoryEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Proactive Check-Ins & Suggestion Banners
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Scans stale problems or pending goals to surface proactive gentle reminders on your dashboard.
              </p>
            </div>
            <button
              id="btn-toggle-proactive"
              onClick={handleToggleProactive}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                profile?.proactiveInsightsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  profile?.proactiveInsightsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Saved AI Memories Manager */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-500" />
              <span>Learned Context Memory ({memories.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These are specific facts and goals extracted during past reflections to give you personalized responses.
            </p>
          </div>

          {memories.length > 0 && (
            <button
              id="btn-clear-all-memories"
              onClick={() => setShowClearConfirm(true)}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Memories</span>
            </button>
          )}
        </div>

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-xs space-y-2">
            <p className="font-bold text-rose-900 dark:text-rose-200">
              Are you sure you want to delete all learned memory items?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClearAllMemories}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold"
              >
                Yes, Delete All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading memories...</div>
        ) : memories.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            No memories stored yet. As you reflect in the journal or solve problems, MindBridge stores helpful context here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {memories.map((mem) => (
              <div
                key={mem.id}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px]">
                      {mem.category || 'Context'}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(mem.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">
                    {mem.content}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteMemory(mem.id)}
                  title="Forget this memory"
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Export & Account Reset Section */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
          Data Export & Sovereign Erasure
        </h3>
        <p className="text-xs text-slate-500">
          Download your complete history in open JSON format, or request complete account erasure.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            id="btn-export-all-json"
            onClick={handleExportAllData}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Packaging Export...' : 'Download Full Data Archive (JSON)'}</span>
          </button>

          <button
            id="btn-reset-account"
            onClick={() => setShowAccountResetConfirm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-xs transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Delete All Data</span>
          </button>
        </div>

        {/* Account Reset Confirmation Modal */}
        {showAccountResetConfirm && (
          <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs space-y-3">
            <h4 className="font-bold text-rose-900 dark:text-rose-200">
              Irreversible Account Erasure
            </h4>
            <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
              This action will permanently delete all your journal entries, solved problems, goals, decisions, memories, and insights from Firestore.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleFullAccountReset}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Permanently Delete Everything
              </button>
              <button
                onClick={() => setShowAccountResetConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
