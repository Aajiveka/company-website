import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/employer/components/Cards/ui';
import {
  useRequestableDocumentTypes,
  useRequestApplicantDocuments,
} from '@/employer/services/employer.api';
import { getErrorMessage } from '@/lib/axios';

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20';

/** Name the documents Q3 should collect from a selected candidate. */
export function RequestDocumentsForm({
  mapId,
  onDone,
  onCancel,
}: {
  mapId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const request = useRequestApplicantDocuments(mapId);
  const { data: suggestions = [] } = useRequestableDocumentTypes();
  const [docs, setDocs] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const has = (name: string) => docs.some((d) => d.toLowerCase() === name.trim().toLowerCase());

  const add = (name: string) => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean || has(clean)) return;
    setDocs((prev) => [...prev, clean]);
  };

  const addDraft = (e?: FormEvent) => {
    e?.preventDefault();
    // Several at once: "PAN, Aadhar, Payslips"
    draft.split(',').forEach(add);
    setDraft('');
  };

  const send = async () => {
    const all = [
      ...docs,
      ...draft
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d && !has(d)),
    ];
    if (!all.length) {
      setError('Write at least one document');
      return;
    }
    setError(null);
    try {
      await request.mutateAsync(all);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not request documents'));
    }
  };

  const unused = suggestions.filter((s) => !has(s.name));

  return (
    <div className="space-y-3 text-xs">
      <p className="text-slate-600">
        Write the documents you need. Q3 will collect them from the candidate for you to review.
      </p>

      <form className="flex gap-2" onSubmit={addDraft}>
        <input
          autoFocus
          className={fieldClass}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Last 3 months payslips, Relieving letter"
          aria-label="Document name"
        />
        <SecondaryButton type="submit" disabled={!draft.trim()}>
          <Plus className="h-3.5 w-3.5" /> Add
        </SecondaryButton>
      </form>

      {docs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {docs.map((d) => (
            <li
              key={d}
              className="inline-flex items-center gap-1 rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[11px] font-medium text-[#1A56DB]"
            >
              {d}
              <button
                type="button"
                aria-label={`Remove ${d}`}
                className="rounded-full hover:text-rose-600"
                onClick={() => setDocs((prev) => prev.filter((x) => x !== d))}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {unused.length > 0 && (
        <div>
          <p className="mb-1 text-slate-500">Quick add</p>
          <div className="flex flex-wrap gap-1.5">
            {unused.map((s) => (
              <button
                key={s.documentTypeId}
                type="button"
                onClick={() => add(s.name)}
                className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:border-[#1A56DB] hover:text-[#1A56DB]"
              >
                <Plus className="h-3 w-3" /> {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p
          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <PrimaryButton
          disabled={request.isPending || (!docs.length && !draft.trim())}
          onClick={() => void send()}
        >
          {request.isPending
            ? 'Sending…'
            : `Send request to Q3${docs.length ? ` (${docs.length})` : ''}`}
        </PrimaryButton>
        <SecondaryButton disabled={request.isPending} onClick={onCancel}>
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}
