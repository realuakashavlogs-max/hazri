import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', action?: ToastAction) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type, action }]);
      setTimeout(() => {
        removeToast(id);
      }, action ? 6000 : 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toast Container */}
      <div
        role="region"
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-6 end-4 start-4 sm:start-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => {
          const styles = {
            success:
              'bg-[#16A34A] text-white border-emerald-500/40',
            error:
              'bg-[#DC2626] text-white border-red-400/40',
            info:
              'bg-[#0F172A] text-white border-slate-700 dark:bg-[#111A2E] dark:border-[#1E293B]',
          }[toast.type];

          const Icon = {
            success: CheckCircle,
            error: AlertCircle,
            info: Info,
          }[toast.type];

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition-all duration-150 ${styles}`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="break-words">{toast.message}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      removeToast(toast.id);
                    }}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors duration-150"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors duration-150"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};
