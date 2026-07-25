import { useMemo, useState } from 'react';
import { Copy, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Badge, Breadcrumbs, Button, Card, Modal, useToast } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';

type TemplateCategory = 'interview' | 'offer' | 'rejection' | 'general';

interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  body: string;
}

const CATEGORY_TONE: Record<TemplateCategory, BadgeTone> = {
  interview: 'purple',
  offer: 'green',
  rejection: 'red',
  general: 'blue',
};

const TEMPLATES: Template[] = [
  {
    id: 'interview-invitation',
    name: 'Interview Invitation',
    category: 'interview',
    subject: 'Interview Invitation for {{jobTitle}} at {{companyName}}',
    body: `Dear {{candidateName}},

We are pleased to inform you that your application for the position of {{jobTitle}} at {{companyName}} has been shortlisted. We would like to invite you for an interview.

Date: {{interviewDate}}

Please confirm your availability by replying to this email. If you have any questions, feel free to reach out.

We look forward to meeting you.

Best regards,
{{companyName}} Recruitment Team`,
  },
  {
    id: 'interview-reminder',
    name: 'Interview Reminder',
    category: 'interview',
    subject: 'Reminder: Your Interview for {{jobTitle}} is Coming Up',
    body: `Dear {{candidateName}},

This is a friendly reminder about your upcoming interview for the position of {{jobTitle}} at {{companyName}}.

Date: {{interviewDate}}

Please ensure you arrive on time and bring any required documents. If you need to reschedule, please let us know as soon as possible.

Best regards,
{{companyName}} Recruitment Team`,
  },
  {
    id: 'interview-reschedule',
    name: 'Interview Reschedule',
    category: 'interview',
    subject: 'Interview Rescheduled: {{jobTitle}} at {{companyName}}',
    body: `Dear {{candidateName}},

We need to reschedule your interview for the position of {{jobTitle}} at {{companyName}}.

New Date: {{interviewDate}}

We apologize for any inconvenience. Please confirm your availability for the new date by replying to this email.

Best regards,
{{companyName}} Recruitment Team`,
  },
  {
    id: 'job-offer',
    name: 'Job Offer',
    category: 'offer',
    subject: 'Job Offer: {{jobTitle}} at {{companyName}}',
    body: `Dear {{candidateName}},

Congratulations! We are delighted to offer you the position of {{jobTitle}} at {{companyName}}.

We were impressed by your skills and experience throughout the interview process. Please find the details of your offer below and let us know your decision at your earliest convenience.

We look forward to welcoming you to our team.

Best regards,
{{companyName}} Recruitment Team`,
  },
  {
    id: 'offer-followup',
    name: 'Offer Follow-up',
    category: 'offer',
    subject: 'Follow-up: Your Offer for {{jobTitle}} at {{companyName}}',
    body: `Dear {{candidateName}},

We wanted to follow up on the offer we extended to you for the position of {{jobTitle}} at {{companyName}}.

We understand you may need time to consider, but we would appreciate hearing from you soon. If you have any questions or would like to discuss the offer further, please do not hesitate to reach out.

Best regards,
{{companyName}} Recruitment Team`,
  },
  {
    id: 'application-rejection',
    name: 'Application Rejection',
    category: 'rejection',
    subject: 'Update on Your Application for {{jobTitle}}',
    body: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{companyName}} and for taking the time to apply.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current requirements. This decision does not reflect on your abilities, and we encourage you to apply for future openings that match your profile.

We wish you the best in your job search.

Best regards,
{{companyName}} Recruitment Team`,
  },
  {
    id: 'post-interview-rejection',
    name: 'Post-Interview Rejection',
    category: 'rejection',
    subject: 'Update Following Your Interview for {{jobTitle}}',
    body: `Dear {{candidateName}},

Thank you for taking the time to interview for the {{jobTitle}} position at {{companyName}}. We enjoyed learning more about your experience and skills.

After thorough deliberation, we have decided to proceed with another candidate. This was a difficult decision given the quality of applicants we met. We would be happy to keep your profile on file for future opportunities.

We wish you continued success in your career.

Best regards,
{{companyName}} Recruitment Team`,
  },
  {
    id: 'welcome',
    name: 'Welcome',
    category: 'general',
    subject: 'Welcome to {{companyName}}, {{candidateName}}!',
    body: `Dear {{candidateName}},

Welcome to {{companyName}}! We are thrilled to have you join our team as {{jobTitle}}.

Our team is excited to work with you. You will receive further details about your onboarding process shortly. In the meantime, feel free to reach out if you have any questions.

We look forward to a successful journey together.

Best regards,
{{companyName}} Team`,
  },
  {
    id: 'followup',
    name: 'Follow-up',
    category: 'general',
    subject: 'Following Up: {{jobTitle}} at {{companyName}}',
    body: `Dear {{candidateName}},

We wanted to touch base regarding your application for {{jobTitle}} at {{companyName}}.

Our team is still reviewing applications, and we appreciate your patience. We will be in touch soon with an update on the status of your application.

Thank you for your continued interest in {{companyName}}.

Best regards,
{{companyName}} Recruitment Team`,
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    category: 'general',
    subject: 'Thank You for Your Interest in {{companyName}}',
    body: `Dear {{candidateName}},

Thank you for expressing your interest in opportunities at {{companyName}}. We appreciate the time you took to apply for the {{jobTitle}} position.

We have received your application and our team will review it carefully. You can expect to hear from us within the next few business days.

Best regards,
{{companyName}} Recruitment Team`,
  },
];

function snippetPreview(body: string, maxLen = 100): string {
  const cleaned = body.replace(/\n+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).trimEnd() + '...';
}

export default function TemplateLibraryPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const filtered = useMemo(() => {
    let results = TEMPLATES;
    if (activeCategory !== 'all') {
      results = results.filter((tpl) => tpl.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (tpl) =>
          tpl.name.toLowerCase().includes(q) ||
          tpl.subject.toLowerCase().includes(q) ||
          tpl.body.toLowerCase().includes(q),
      );
    }
    return results;
  }, [search, activeCategory]);

  const categoryTabs: { key: TemplateCategory | 'all'; label: string }[] = [
    { key: 'all', label: t('templateLibrary.categoryAll') },
    { key: 'interview', label: t('templateLibrary.categoryInterview') },
    { key: 'offer', label: t('templateLibrary.categoryOffer') },
    { key: 'rejection', label: t('templateLibrary.categoryRejection') },
    { key: 'general', label: t('templateLibrary.categoryGeneral') },
  ];

  async function copyToClipboard(template: Template) {
    const text = `Subject: ${template.subject}\n\n${template.body}`;
    try {
      await navigator.clipboard.writeText(text);
      notify(t('templateLibrary.copiedSuccess'), 'success');
    } catch {
      notify(t('templateLibrary.copiedError'), 'error');
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/company/profile' },
          { label: t('templateLibrary.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">
        {t('templateLibrary.heading')}
      </h1>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('templateLibrary.searchPlaceholder')}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      {/* Category tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categoryTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveCategory(tab.key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              activeCategory === tab.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3 py-8">
            <Search className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-navy">{t('templateLibrary.noResults')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('templateLibrary.noResultsHint')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-navy">{tpl.name}</h3>
                  <Badge tone={CATEGORY_TONE[tpl.category]}>
                    {t(`templateLibrary.category${tpl.category.charAt(0).toUpperCase() + tpl.category.slice(1)}`)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {snippetPreview(tpl.body)}
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewTemplate(tpl)}
                >
                  {t('templateLibrary.useTemplate')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <Modal
        open={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name}
        className="max-w-lg"
      >
        {previewTemplate && (
          <div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('templateLibrary.subject')}
              </label>
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-navy dark:bg-gray-700 dark:text-white">
                {previewTemplate.subject}
              </p>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('templateLibrary.body')}
              </label>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 font-sans text-sm text-navy dark:bg-gray-700 dark:text-white">
                {previewTemplate.body}
              </pre>
            </div>
            <div className="mb-3">
              <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">
                {t('templateLibrary.placeholders')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(previewTemplate.body.matchAll(/\{\{(\w+)\}\}/g))
                  .map((m) => m[0])
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .map((placeholder) => (
                    <code
                      key={placeholder}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-primary dark:bg-gray-600"
                    >
                      {placeholder}
                    </code>
                  ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => copyToClipboard(previewTemplate)}
              >
                <Copy className="mr-1.5 h-4 w-4" />
                {t('templateLibrary.copyToTemplates')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
