import { useTranslation } from 'react-i18next';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';

/**
 * Served from tblSiteDocument through the API, not from `public/`.
 *
 * The bytes live in object storage, so replacing the book is an upload plus one row update
 * rather than a redeploy — and a 7 MB binary stays out of the repo. The API sets the inline
 * headers, which is why the viewer and the download are two routes rather than one URL.
 */
const BOOK_URL = '/api/site-docs/aajivika-book';
const BOOK_DOWNLOAD_URL = `${BOOK_URL}/download`;
const BOOK_FILENAME = 'Aajivika-Book.pdf';

/**
 * The student handbook.
 *
 * The page is the viewer: the book fills the screen below the header rather than sitting in a
 * card under a banner, because a 10-page A4 brochure is unreadable in a box. `<object>` is the
 * embed that degrades usefully — a browser with no PDF plugin (most mobile browsers) renders
 * the children instead, which is why the download and open-in-new-tab links are repeated there
 * rather than only sitting in the bar above.
 */
export default function StudentGuidePage() {
  const { t } = useTranslation();

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <a href={BOOK_DOWNLOAD_URL} download={BOOK_FILENAME}>
        <Button variant="accent" size="sm">
          <Download className="mr-2 h-4 w-4" aria-hidden />
          {t('student.download')}
        </Button>
      </a>
      <a href={BOOK_URL} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm">
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
          {t('student.openInNewTab')}
        </Button>
      </a>
    </div>
  );

  return (
    <>
      <Seo title={t('student.title')} description={t('student.subtitle')} />

      {/* The header is fixed and transparent, so the page has to reserve its height itself. */}
      <div className="flex h-screen flex-col pt-[72px] sm:pt-[88px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2.5 sm:px-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="min-w-0">
            <h1 className="truncate font-heading text-base font-bold text-navy dark:text-gray-100">
              {t('student.title')}
            </h1>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{t('student.subtitle')}</p>
          </div>
          {actions}
        </div>

        {/* min-h-0 so the embed shrinks inside the flex column instead of overflowing it. */}
        <object
          data={BOOK_URL}
          type="application/pdf"
          title={t('student.title')}
          className="w-full min-h-0 flex-1 bg-gray-100 dark:bg-gray-900"
        >
          <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
            <p className="text-gray-600 dark:text-gray-300">{t('student.noPreview')}</p>
            {actions}
          </div>
        </object>
      </div>
    </>
  );
}
