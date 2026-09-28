import React from 'react';
import { ShieldCheck, ShieldAlert, Lock, Database, Globe, Key, Cpu, X } from 'lucide-react';
import { motion } from 'motion/react';

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto text-slate-800 dark:text-slate-100"
      >
        <button
          id="btn-close-threat-modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Agentic Threat Model & Security Architecture</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              5-Zone Scenario Threat Analysis & OWASP Defense Matrix
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm">
          {/* Summary Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="p-3">Threat Zone</th>
                  <th className="p-3">Identified Risks</th>
                  <th className="p-3">Countermeasure & Mitigation</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-3 font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-500" />
                    1. Input Surfaces
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    Prompt injection, malformed JSON, payload overflows, XSS in journal.
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    Strict JSON schema validation, HTML entity encoding, defensive payload ingestion with null guards, text length constraints.
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Enforced
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-500" />
                    2. Planning & Reasoning
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    System instruction bypass, hallucinated medical/legal authority, prompt exfiltration.
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    Strict system prompt isolation, disclaimer guardrails for medical/legal safety, model fallback ladder for high availability.
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Enforced
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-500" />
                    3. Tool Execution & API
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    Unauthenticated API calls, privilege escalation, SSRF, direct browser key leakage.
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    Server-side proxy exclusively for Gemini API; client never touches API keys; Firebase ID token header verification on all `/api/*`.
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Enforced
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-500" />
                    4. Memory & State
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    Cross-user data leakage in Firestore, unauthorized document reads/writes, unstripped `undefined` driver crashes.
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    Strict Firestore security rules (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">request.auth.uid == userId</code>), zero insecure defaults, recursive undefined stripping utility.
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Enforced
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-500" />
                    5. Inter-System Comms
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    Token hijacking, insecure secrets in source code, missing Secret Manager bindings.
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    Zero-hardcoding guarantee; secrets injected via environment variables & Secret Manager; Bearer JWT validation.
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Enforced
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Zero Insecure Defaults
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The Firestore security configuration forbids wildcard access. Every subcollection (journalEntries, problemSessions, goals, brainstorms, memories, summaries) is locked behind owner UID verification.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-500" />
                Resilient Gemini Fallback Ladder
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Backend routes automatically cascade through <code>gemini-2.5-flash</code>, <code>gemini-1.5-flash</code>, and <code>gemini-2.0-flash</code> to ensure high availability without service interruption.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            id="btn-threat-modal-confirm"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Acknowledge & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
