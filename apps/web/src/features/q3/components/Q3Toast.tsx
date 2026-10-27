import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ToastContext, type ToastApi } from './q3-toast-context';

/**
 * Q3's feedback toast (Figma "Overlays · feedback toasts"): a dark #111827 card, bottom centre,
 * a round status icon, a 13.5px title and a 12px grey line under it. Auto-closes after 2.5s,
 * closes on click — exactly the prototype's AFTER_TIMEOUT / ON_CLICK pair.
 *
 * Its own provider rather than the app-wide useToast, whose light corner toast is a different
 * component from the one the designs draw.
 */
interface ToastItem {
  id: number;
  title: string;
  body?: string;
  tone: 'success' | 'error';
}

const DURATION_MS = 2500;
/** Errors stay a little longer — they usually need reading. */
const ERROR_DURATION_MS = 5000;

export function Q3ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const push = useCallback((tone: ToastItem['tone'], title: string, body?: string) => {
    const id = nextId.current++;
    // One at a time, as the prototype shows them; a new toast replaces the last.
    setItems([{ id, title, body, tone }]);
  }, []);

  const api = useRef<ToastApi>({
    success: (t, b) => push('success', t, b),
    error: (t, b) => push('error', t, b),
  });

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-[100px]"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, item.tone === 'error' ? ERROR_DURATION_MS : DURATION_MS);
    return () => window.clearTimeout(t);
  }, [item, onDone]);

  return (
    <button
      type="button"
      onClick={onDone}
      className="pointer-events-auto flex max-w-full animate-[slide-up_.2s_ease-out] items-center gap-3 rounded-xl bg-q3-ink py-3 pl-3.5 pr-[18px] text-left shadow-q3-toast"
    >
      <span
        className={cn(
          'inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white',
          item.tone === 'success' ? 'bg-q3-green' : 'bg-q3-red',
        )}
        aria-hidden
      >
        {item.tone === 'success' ? <Check className="h-[11px] w-[11px]" strokeWidth={3} /> : <X className="h-[11px] w-[11px]" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold leading-4 text-white">{item.title}</span>
        {item.body && <span className="mt-px block text-xs leading-[15px] text-q3-muted-light">{item.body}</span>}
      </span>
    </button>
  );
}
