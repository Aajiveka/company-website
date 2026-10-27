import { Link } from 'react-router-dom';
import type { AdminAuditEntry } from '../admin.types';
import { actionLabel, entityHref, fmtDate } from '../admin.format';

/**
 * The detail as short "key: value" pairs. Audit detail is free-form JSON written by many
 * services; only flat scalar fields are shown, so a large payload cannot flood the list.
 */
function detailSummary(detail: unknown): string | null {
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null;
  const parts = Object.entries(detail as Record<string, unknown>)
    .filter(([, v]) => v != null && v !== '' && ['string', 'number', 'boolean'].includes(typeof v))
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`);
  return parts.length ? parts.join(' · ') : null;
}

export function AuditList({
  entries,
  empty,
  showActor = true,
}: {
  entries: AdminAuditEntry[];
  empty: string;
  showActor?: boolean;
}) {
  if (!entries.length) return <p className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">{empty}</p>;
  return (
    <ul className="divide-y divide-aj-line-soft dark:divide-gray-700">
      {entries.map((a) => {
        const href = entityHref(a.entity, a.entityId);
        const summary = detailSummary(a.detail);
        return (
          <li key={a.id} className="px-4 py-3 text-sm sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-medium text-gray-800 dark:text-gray-100">{actionLabel(a.action)}</span>
              <time dateTime={a.at} className="text-xs text-gray-400">
                {fmtDate(a.at, true)}
              </time>
            </div>
            <p className="mt-0.5 break-words text-xs text-gray-500 dark:text-gray-400">
              {showActor &&
                (a.userId ? (
                  <Link to={`/admin/users/${a.userId}`} className="hover:text-aj-blue hover:underline">
                    {a.actor}
                  </Link>
                ) : (
                  a.actor
                ))}
              {showActor && a.entity && ' · '}
              {a.entity &&
                (href ? (
                  <Link to={href} className="hover:text-aj-blue hover:underline">
                    {a.entity} #{a.entityId}
                  </Link>
                ) : (
                  <span>
                    {a.entity}
                    {a.entityId && a.entityId !== '0' ? ` #${a.entityId}` : ''}
                  </span>
                ))}
              {summary && <span className="block font-mono text-[11px] text-gray-400">{summary}</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
