import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChevronDown, Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useQ3Queue } from '../q3.api';
import { Q3Shell } from './Q3Shell';
import { CardMessage, Q3Card, SkeletonRows } from './primitives';

type QueueName = 'scheduling' | 'decisions' | 'documents' | 'offers';

const BASE: Record<QueueName, string> = {
  scheduling: '/q3/scheduling',
  decisions: '/q3/decisions',
  documents: '/q3/documents',
  offers: '/q3/offers',
};

/**
 * Slot Scheduling, Decisions, Documents and Offers & Joining are one candidate at a time in
 * the designs. The sidebar link has no candidate, so it opens the first one in that queue —
 * the one that needs attention soonest — and this switcher walks the rest.
 */
export function QueueSwitcher({ name, mapId }: { name: QueueName; mapId: number }) {
  const { data } = useQ3Queue(name);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!data || data.length < 2) return null;
  const index = data.findIndex((x) => x.mapId === mapId);

  return (
    <div className="relative inline-flex shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-q3-blue hover:bg-q3-blue-soft"
      >
        {index >= 0 ? `${index + 1} of ${data.length}` : `${data.length} in queue`}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-40 mt-1 max-h-80 w-72 overflow-y-auto rounded-xl border border-q3-line bg-q3-surface p-1 shadow-q3-pop"
        >
          {data.map((item) => (
            <li key={item.mapId}>
              <button
                type="button"
                role="option"
                aria-selected={item.mapId === mapId}
                onClick={() => {
                  setOpen(false);
                  navigate(`${BASE[name]}/${item.mapId}`);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-q3-field',
                  item.mapId === mapId && 'bg-q3-blue-soft',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-q3-ink">{item.name}</span>
                  <span className="block truncate text-xs text-q3-muted">{item.company}</span>
                </span>
                {item.round && <span className="text-xs font-semibold text-q3-ink-soft">{item.round}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** `/q3/scheduling` with no candidate: open the first one in the queue, or say it is empty. */
export function QueueIndex({
  name,
  title,
  subtitle,
  emptyTitle,
  emptyBody,
}: {
  name: QueueName;
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const { data, isLoading, isError, refetch } = useQ3Queue(name);
  if (data?.length) return <Navigate to={`${BASE[name]}/${data[0].mapId}`} replace />;
  return (
    <Q3Shell title={title} subtitle={subtitle}>
      <Q3Card>
        {isLoading ? (
          <SkeletonRows rows={3} />
        ) : isError ? (
          <CardMessage title="Couldn't load this queue" body="Check your connection and try again." action={{ label: 'Retry', onClick: () => void refetch() }} />
        ) : (
          <CardMessage icon={Inbox} title={emptyTitle} body={emptyBody} />
        )}
      </Q3Card>
    </Q3Shell>
  );
}
