import { useTranslation } from 'react-i18next';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';

/** Served from `public/`, so it is a plain static file rather than an API download. */
const BOOK_URL = '/docs/aajivika-book.pdf';
const BOOK_FILENAME = 'Aajivika-Book.pdf';

/**
 * The student handbook, reached from the navbar's Login menu.
 *
 * It is not a login: the menu entry is where students look for it, but the page is public and
 * shows the book inline. `<object>` is the embed that degrades usefully — a browser with no
 * PDF plugin (most mobile browsers) renders the children instead, which is why the download
 * and open-in-new-tab links are repeated there rather than only sitting under the frame.
 */
export default function StudentGuidePage() {
  const { t } = useTranslation();

  const actions = (
    <div className="flex flex-wrap justify-center gap-3">
      <a href={BOOK_URL} download={BOOK_FILENAME}>
        <Button variant="accent">
          <Download className="mr-2 h-4 w-4" aria-hidden />
          {t('student.download')}
        </Button>
      </a>
      <a href={BOOK_URL} target="_blank" rel="noreferrer">
        <Button variant="outline">
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
          {t('student.openInNewTab')}
        </Button>
      </a>
    </div>
  );

  return (
    <>
      <Seo title={t('student.title')} description={t('student.subtitle')} />
      <PageBanner variant="subscription" title={t('student.title')} subtitle={t('student.subtitle')} />

      <section className="container py-10">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <object
            data={BOOK_URL}
            type="application/pdf"
            title={t('student.title')}
            className="h-[70vh] min-h-[420px] w-full"
          >
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-gray-600 dark:text-gray-300">{t('student.noPreview')}</p>
              {actions}
            </div>
          </object>
        </div>

        <div className="mt-6">{actions}</div>
      </section>
    </>
  );
}
