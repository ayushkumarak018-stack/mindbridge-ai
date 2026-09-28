import React from 'react';
import { useNotification, ToastMessage } from '../context/NotificationContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotification();

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-sky-500 shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
      case 'warning':
        return 'border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200';
      case 'error':
        return 'border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
      default:
        return 'border-sky-500/30 bg-sky-50/90 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200';
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all ${getBorderColor(
              t.type
            )}`}
          >
            {getIcon(t.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.message && <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{t.message}</p>}
            </div>
            <button
              id={`btn-close-toast-${t.id}`}
              onClick={() => removeToast(t.id)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
