import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '@/lib/axios';
import { Button, LocationSelect, Modal, useToast } from '@/components/ui';
import { useCityMasters, useEmployerRegistrations, useReviewEmployer } from '../admin.api';
import type { EmployerRegistration } from '../admin.types';
import { AdminShell } from '../components/AdminShell';
import {
  DataTable,
  Empty,
  ErrorState,
  Facts,
  Panel,
  Pill,
  StatusTabs,
  type ColumnDef,
} from '../components/primitives';
import { fmtDate } from '../admin.format';

type Tab = 'Pending' | 'Approved' | 'Rejected' | '';
const TONE = { Pending: 'amber', Approved: 'green', Rejected: 'red' } as const;

/**
 * Pending → Approved | Rejected, once. Approving creates the company, its person record, the
 * employer login and its role in one transaction on the API, and mails a temporary password;
 * a second review of the same registration is refused there (409), not just hidden here.
 */
function ReviewModal({ reg, onClose }: { reg: EmployerRegistration; onClose: () => void }) {
  const { notify } = useToast();
  const review = useReviewEmployer();
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | null>(null);
  // The company record needs a real city; the registration only has free text.
  const [cityId, setCityId] = useState<number | null>(reg.suggestedCityId);
  const [cityError, setCityError] = useState<string | undefined>();
  const masters = useCityMasters(true);

  const submit = () => {
    if (!decision) return;
    review.mutate(
      { id: reg.id, decision, notes: notes.trim() || undefined, cityId: decision === 'Approved' ? (cityId ?? undefined) : undefined },
      {
        onSuccess: () => {
          notify(
            decision === 'Approved'
              ? `${reg.companyName} approved — sign-in details were sent to ${reg.emailCompany}`
              : `${reg.companyName} rejected`,
            'success',
          );
          onClose();
        },
        onError: (e) => notify(getErrorMessage(e, 'The review was not saved'), 'error'),
      },
    );
  };

  return (
    <Modal open onClose={onClose} title={`Review: ${reg.companyName}`}>
      <div className="space-y-4">
        <Facts
          items={[
            ['Company email (becomes the login)', reg.emailCompany],
            ['HR email', reg.emailHR],
            ['Company phone', reg.contactNumberCompany],
            ['HR phone', reg.contactNumberHR],
            ['Location', reg.location],
            ['Industry', reg.industryType],
            ['Website', reg.website],
            ['Submitted', fmtDate(reg.createdAt, true)],
          ]}
        />
        {reg.aboutCompany && (
          <p className="max-h-32 overflow-y-auto whitespace-pre-line rounded-lg bg-aj-surface-soft p-3 text-sm text-gray-700 dark:bg-gray-700/50 dark:text-gray-200">
            {reg.aboutCompany}
          </p>
        )}
        <div>
          <LocationSelect
            label="Company city"
            required
            states={masters.data?.states}
            cities={masters.data?.cities}
            value={cityId}
            onChange={(v) => {
              setCityId(v);
              setCityError(undefined);
            }}
            placeholder={masters.isLoading ? 'Loading cities…' : 'Select the city'}
            error={cityError}
          />
          {reg.location && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              They wrote “{reg.location}”{reg.suggestedCityId ? ', matched above.' : ', which matches no city on record.'}
            </p>
          )}
        </div>
        <label className="block text-sm font-medium text-navy dark:text-gray-200">
          Notes {decision === 'Rejected' ? '(recommended — why it was rejected)' : '(optional)'}
          <textarea
            className="mt-1 block w-full rounded-lg border border-aj-line px-3 py-2 text-sm focus:border-aj-blue focus:outline-none focus:ring-2 focus:ring-aj-blue/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {decision ? (
          <div className="rounded-lg border border-aj-line p-3 dark:border-gray-600">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {decision === 'Approved'
                ? `Approve ${reg.companyName}? This creates the company and an employer login for ${reg.emailCompany}, and emails a temporary password.`
                : `Reject ${reg.companyName}? No account is created. This cannot be undone.`}
            </p>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button size="sm" variant="outline" onClick={() => setDecision(null)} disabled={review.isPending}>
                Back
              </Button>
              <Button size="sm" variant={decision === 'Approved' ? 'primary' : 'danger'} isLoading={review.isPending} onClick={submit}>
                {decision === 'Approved' ? 'Yes, approve' : 'Yes, reject'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="danger" size="sm" onClick={() => setDecision('Rejected')}>
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => (cityId ? setDecision('Approved') : setCityError('Choose the company’s city first'))}
            >
              Approve
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function AdminEmployerApprovalsPage() {
  const [params, setParams] = useSearchParams();
  // Pending is the default view, so "All" needs a value of its own in the URL.
  const raw = params.get('status');
  const tab = (raw === 'all' ? '' : (raw ?? 'Pending')) as Tab;
  const { data, isLoading, error, refetch } = useEmployerRegistrations(tab || undefined);
  const [reviewing, setReviewing] = useState<EmployerRegistration | null>(null);

  const columns: ColumnDef<EmployerRegistration>[] = [
    {
      key: 'company',
      header: 'Company',
      cell: (r) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold text-navy dark:text-white">{r.companyName}</span>
          <span className="block truncate text-xs font-normal text-gray-500">{r.emailCompany}</span>
        </span>
      ),
    },
    { key: 'location', header: 'Location', cell: (r) => r.location || '—' },
    { key: 'industry', header: 'Industry', cell: (r) => r.industryType || '—' },
    { key: 'status', header: 'Status', cell: (r) => <Pill tone={TONE[r.status]}>{r.status}</Pill> },
    {
      key: 'submitted',
      header: 'Submitted',
      cell: (r) => fmtDate(r.createdAt),
      className: 'whitespace-nowrap',
    },
    {
      key: 'action',
      header: 'Action',
      wideOnCard: true,
      cell: (r) =>
        r.status === 'Pending' ? (
          <Button variant="outline" size="sm" onClick={() => setReviewing(r)}>
            Review
          </Button>
        ) : (
          <span className="text-xs text-gray-500">
            {r.reviewedBy ? `${r.reviewedBy}, ` : ''}
            {fmtDate(r.reviewedAt)}
            {r.adminNotes && <span className="block truncate" title={r.adminNotes}>“{r.adminNotes}”</span>}
          </span>
        ),
    },
  ];

  return (
    <AdminShell
      title="Employer approvals"
      subtitle="Companies that registered and are waiting to be let in"
      crumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Employer approvals' }]}
    >
      <Panel bodyClassName="p-0">
        <div className="border-b border-aj-line-soft p-4 dark:border-gray-700">
          <StatusTabs<Tab>
            label="Registration status"
            value={tab}
            onChange={(v) => setParams(v === 'Pending' ? {} : { status: v || 'all' }, { replace: true })}
            tabs={[
              { value: 'Pending', label: 'Pending' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Rejected', label: 'Rejected' },
              { value: '', label: 'All' },
            ]}
          />
        </div>
        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <DataTable
            columns={columns}
            rows={data ?? []}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            empty={
              <Empty
                title={tab === 'Pending' ? 'No registrations are waiting for review' : 'No employer registrations found.'}
                hint={tab === 'Pending' ? 'New ones appear here as companies sign up.' : undefined}
              />
            }
          />
        )}
      </Panel>
      {reviewing && <ReviewModal reg={reviewing} onClose={() => setReviewing(null)} />}
    </AdminShell>
  );
}
