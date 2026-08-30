import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface NotificationContextType {
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg: string, title?: string) => addToast('success', msg, title), [addToast]);
  const showError = useCallback((msg: string, title?: string) => addToast('error', msg, title), [addToast]);
  const showWarning = useCallback((msg: string, title?: string) => addToast('warning', msg, title), [addToast]);
  const showInfo = useCallback((msg: string, title?: string) => addToast('info', msg, title), [addToast]);

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto rounded-xl p-4 shadow-xl border flex items-start gap-3 backdrop-blur-md ${
                t.type === 'success'
                  ? 'bg-emerald-900/90 text-white border-emerald-700/60'
                  : t.type === 'error'
                  ? 'bg-rose-900/90 text-white border-rose-700/60'
                  : t.type === 'warning'
                  ? 'bg-amber-900/90 text-white border-amber-700/60'
                  : 'bg-slate-900/90 text-white border-slate-700/60'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
                {t.type === 'error' && <XCircle className="w-5 h-5 text-rose-300" />}
                {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-300" />}
                {t.type === 'info' && <Info className="w-5 h-5 text-sky-300" />}
              </div>
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-sm font-semibold tracking-wide text-white">{t.title}</div>}
                <div className="text-xs sm:text-sm text-slate-100 font-normal leading-relaxed">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};
