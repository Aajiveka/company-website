import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const colors = {
  success: 'border-green-200 bg-white text-green-800',
  error: 'border-red-200 bg-white text-red-800',
  info: 'border-blue-200 bg-white text-blue-800',
};

let counter = 0;

/** Toast provider + `useToast()` hook — lightweight replacement for SweetAlert toasts. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = ++counter;
      setToasts((t) => [...t, { id, kind, message }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[1100] flex w-80 max-w-[90vw] flex-col gap-2">
        {toasts.map(({ id, kind, message }) => {
          const Icon = icons[kind];
          return (
            <div
              key={id}
              className={cn('flex items-start gap-2 rounded-lg border p-3 text-sm shadow-lg', colors[kind])}
              role="status"
            >
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
              <span className="flex-1">{message}</span>
              <button onClick={() => remove(id)} aria-label="Dismiss">
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
