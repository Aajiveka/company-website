import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { AdminApplication } from '../admin.types';

/** The workspace link for the next step — opened in place, since Admin is allowed in. */
export function NextStepLink({ a }: { a: AdminApplication }) {
  if (!a.nextStep.to || !a.nextStep.owner) return <span className="text-xs text-gray-500">{a.nextStep.label}</span>;
  return (
    <Link to={a.nextStep.to} className="inline-flex items-start gap-1 text-xs font-semibold text-aj-blue hover:underline">
      <span>
        <span className="mr-1 rounded bg-aj-line-soft px-1 py-px text-[10px] uppercase tracking-wide dark:bg-aj-blue/20">
          {a.nextStep.owner}
        </span>
        {a.nextStep.label}
      </span>
      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
    </Link>
  );
}
