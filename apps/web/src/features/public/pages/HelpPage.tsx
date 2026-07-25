import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  HelpCircle,
  Mail,
  Phone,
  Search,
} from 'lucide-react';
import { Card, Input } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';
import { cn } from '@/lib/cn';

/* ---------- types ---------- */
type Category = 'account' | 'jobs' | 'applications' | 'payments' | 'technical';

interface FaqItem {
  category: Category;
  questionKey: string;
  answerKey: string;
}

const CATEGORIES: Category[] = ['account', 'jobs', 'applications', 'payments', 'technical'];

/* ---------- FAQ data (i18n keys) ---------- */
const FAQ_ITEMS: FaqItem[] = [
  // Account
  { category: 'account', questionKey: 'help.faq.account_q1', answerKey: 'help.faq.account_a1' },
  { category: 'account', questionKey: 'help.faq.account_q2', answerKey: 'help.faq.account_a2' },
  { category: 'account', questionKey: 'help.faq.account_q3', answerKey: 'help.faq.account_a3' },
  // Jobs
  { category: 'jobs', questionKey: 'help.faq.jobs_q1', answerKey: 'help.faq.jobs_a1' },
  { category: 'jobs', questionKey: 'help.faq.jobs_q2', answerKey: 'help.faq.jobs_a2' },
  { category: 'jobs', questionKey: 'help.faq.jobs_q3', answerKey: 'help.faq.jobs_a3' },
  // Applications
  { category: 'applications', questionKey: 'help.faq.applications_q1', answerKey: 'help.faq.applications_a1' },
  { category: 'applications', questionKey: 'help.faq.applications_q2', answerKey: 'help.faq.applications_a2' },
  { category: 'applications', questionKey: 'help.faq.applications_q3', answerKey: 'help.faq.applications_a3' },
  // Payments
  { category: 'payments', questionKey: 'help.faq.payments_q1', answerKey: 'help.faq.payments_a1' },
  { category: 'payments', questionKey: 'help.faq.payments_q2', answerKey: 'help.faq.payments_a2' },
  // Technical
  { category: 'technical', questionKey: 'help.faq.technical_q1', answerKey: 'help.faq.technical_a1' },
  { category: 'technical', questionKey: 'help.faq.technical_q2', answerKey: 'help.faq.technical_a2' },
];

/* ---------- Accordion item ---------- */
function AccordionItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={open}
      >
        <span className="pr-4 font-medium text-navy dark:text-white">{question}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 flex-shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-200',
          open ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-gray-600 dark:text-gray-300">{answer}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function HelpPage() {
  const { t } = useTranslation('public');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (!search.trim()) return true;
      const q = t(item.questionKey).toLowerCase();
      const a = t(item.answerKey).toLowerCase();
      const term = search.toLowerCase();
      return q.includes(term) || a.includes(term);
    });
  }, [activeCategory, search, t]);

  return (
    <>
      <Seo
        title="Help & FAQs"
        description="Find answers to frequently asked questions about Aajiveka. Get help with your account, job search, applications, payments, and more."
        path="/help"
      />
      <PageBanner variant="about" title={t('help.bannerTitle')} />

      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-3xl">
          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('help.searchPlaceholder')}
              className="pl-10"
            />
          </div>

          {/* Category tabs */}
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                activeCategory === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
              )}
            >
              {t('help.categoryAll')}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition',
                  activeCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                )}
              >
                {t(`help.category_${cat}`)}
              </button>
            ))}
          </div>

          {/* FAQ list */}
          {filteredFaqs.length === 0 ? (
            <Card className="text-center">
              <div className="flex flex-col items-center gap-3 py-8">
                <HelpCircle className="h-10 w-10 text-gray-300" aria-hidden />
                <p className="text-navy">{t('help.noResults')}</p>
                <p className="text-sm text-gray-500">{t('help.noResultsHint')}</p>
              </div>
            </Card>
          ) : (
            <Card>
              {filteredFaqs.map((item) => {
                const id = item.questionKey;
                return (
                  <AccordionItem
                    key={id}
                    question={t(item.questionKey)}
                    answer={t(item.answerKey)}
                    open={openId === id}
                    onToggle={() => setOpenId(openId === id ? null : id)}
                  />
                );
              })}
            </Card>
          )}

          {/* Contact support card */}
          <Card className="mt-10">
            <div className="text-center">
              <h2 className="font-heading text-xl font-semibold text-navy">
                {t('help.contactHeading')}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t('help.contactSubtext')}
              </p>
              <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <a
                  href="mailto:info@aajiveka.com"
                  className="flex items-center gap-2 rounded-lg bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/20"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  {t('help.contactEmail')}
                </a>
                <a
                  href="tel:+911234567890"
                  className="flex items-center gap-2 rounded-lg bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/20"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  {t('help.contactPhone')}
                </a>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
