import { useTranslation } from 'react-i18next';
import { Q2Shell } from '../components/Q2Shell';
import { ApplicantsTable } from '../components/ApplicantsTable';

/**
 * Forwarded to Q3.
 *
 * The Figma lists this in the sidebar but draws no frame for it, so it reuses the All
 * Applicants table filtered to the bucket — the relevance tabs are dropped, because every row
 * here has already had its decision made and re-filtering them by relevance says nothing.
 */
export default function Q2ForwardedPage() {
  const { t } = useTranslation('common');
  return (
    <Q2Shell title={t('q2.title')} subtitle={t('q2.subtitle')}>
      <ApplicantsTable
        bucket="forwarded"
        title={t('q2.forwarded.title')}
        subtitleKey="q2.forwarded.subtitle"
        showTabs={false}
      />
    </Q2Shell>
  );
}
