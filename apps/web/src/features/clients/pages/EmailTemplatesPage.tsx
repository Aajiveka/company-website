import { useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, CardSkeleton, Input, useToast } from '@/components/ui';
import { api } from '@/lib/axios';

interface EmailTemplate {
  templateId: string;
  subject: string;
  body: string;
}

const TEMPLATE_TYPES = ['interview_invite', 'selection', 'rejection'] as const;

const PLACEHOLDERS: Record<string, string[]> = {
  interview_invite: ['{{candidateName}}', '{{jobTitle}}', '{{interviewDate}}', '{{interviewMode}}', '{{interviewLocation}}'],
  selection: ['{{candidateName}}', '{{jobTitle}}', '{{companyName}}'],
  rejection: ['{{candidateName}}', '{{jobTitle}}', '{{companyName}}'],
};

function TemplateEditor({
  type,
  template,
  placeholders,
}: {
  type: string;
  template?: EmailTemplate;
  placeholders: string[];
}) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');

  const save = useMutation({
    mutationFn: () =>
      api.put(`/clients/me/email-templates/${type}`, { subject, body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', 'email-templates'] });
      notify(t('emailTemplates.saved'), 'success');
    },
    onError: () => notify(t('emailTemplates.saveFailed'), 'error'),
  });

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
        <FileText className="h-5 w-5 text-primary" />
        {t(`emailTemplates.${type}`)}
      </h3>
      <div className="space-y-3">
        <Input
          label={t('emailTemplates.subject')}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('emailTemplates.subjectPlaceholder')}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">{t('emailTemplates.body')}</label>
          <textarea
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder={t('emailTemplates.bodyPlaceholder')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-500">{t('emailTemplates.availablePlaceholders')}:</span>
          {placeholders.map((p) => (
            <code key={p} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-primary dark:bg-gray-700">
              {p}
            </code>
          ))}
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => save.mutate()} isLoading={save.isPending}>
            <Save className="mr-1 h-4 w-4" /> {t('common:actions.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function EmailTemplatesPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useQuery({
    queryKey: ['client', 'email-templates'],
    queryFn: () => api.get<EmailTemplate[]>('/clients/me/email-templates').then((r) => r.data),
  });

  const templateMap = new Map((data ?? []).map((t) => [t.templateId, t]));

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/company/profile' }, { label: t('emailTemplates.heading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('emailTemplates.heading')}</h1>

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
        </div>
      ) : (
        <div className="space-y-4">
          {TEMPLATE_TYPES.map((type) => (
            <TemplateEditor
              key={type}
              type={type}
              template={templateMap.get(type)}
              placeholders={PLACEHOLDERS[type]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
