import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Button, Card, Modal, useToast } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { api } from '@/lib/axios';

interface EmployerRegistration {
  id: number;
  companyName: string;
  emailCompany: string;
  emailHR: string | null;
  location: string | null;
  industryType: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  reviewedAt: string | null;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  Pending: 'amber',
  Approved: 'green',
  Rejected: 'red',
};

export default function AdminEmployerApprovalsPage() {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const qc = useQueryClient();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<EmployerRegistration | null>(null);
  const [notes, setNotes] = useState('');

  const { data: registrations, isLoading } = useQuery({
    queryKey: ['admin', 'employer-registrations'],
    queryFn: () =>
      api.get<EmployerRegistration[]>('/admin/employer-registrations').then((r) => r.data),
  });

  const review = useMutation({
    mutationFn: ({ id, decision, notes }: { id: number; decision: string; notes?: string }) =>
      api.post(`/admin/employer-registrations/${id}/review`, { decision, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'employer-registrations'] });
      notify('Employer registration reviewed.', 'success');
      setReviewOpen(false);
      setSelected(null);
      setNotes('');
    },
    onError: () => notify(t('errors.somethingWrong'), 'error'),
  });

  const openReview = (reg: EmployerRegistration) => {
    setSelected(reg);
    setNotes('');
    setReviewOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs
        items={[
          { label: t('nav.admin'), to: '/admin' },
          { label: 'Employer Registrations' },
        ]}
      />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">
        Employer Registrations
      </h1>

      {isLoading ? (
        <Card className="animate-pulse p-8">Loading...</Card>
      ) : !registrations?.length ? (
        <Card className="p-8 text-center text-gray-500">No employer registrations found.</Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">{reg.companyName}</td>
                  <td className="px-4 py-3">{reg.emailCompany}</td>
                  <td className="px-4 py-3">{reg.location ?? '—'}</td>
                  <td className="px-4 py-3">{reg.industryType ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[reg.status] ?? 'gray'}>{reg.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(reg.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {reg.status === 'Pending' && (
                      <Button variant="outline" size="sm" onClick={() => openReview(reg)}>
                        Review
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          title={`Review: ${selected.companyName}`}
        >
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Company Email</dt>
                <dd className="font-medium">{selected.emailCompany}</dd>
              </div>
              {selected.emailHR && (
                <div>
                  <dt className="text-gray-500">HR Email</dt>
                  <dd className="font-medium">{selected.emailHR}</dd>
                </div>
              )}
              {selected.location && (
                <div>
                  <dt className="text-gray-500">Location</dt>
                  <dd className="font-medium">{selected.location}</dd>
                </div>
              )}
              {selected.industryType && (
                <div>
                  <dt className="text-gray-500">Industry</dt>
                  <dd className="font-medium">{selected.industryType}</dd>
                </div>
              )}
            </dl>

            <label className="block text-sm font-medium text-navy">
              Notes (optional)
              <textarea
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <div className="flex justify-end gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ id: selected.id, decision: 'Rejected', notes: notes || undefined })
                }
              >
                Reject
              </Button>
              <Button
                size="sm"
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ id: selected.id, decision: 'Approved', notes: notes || undefined })
                }
              >
                Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
