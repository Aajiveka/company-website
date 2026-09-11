import { useTranslation } from 'react-i18next';
import { Q2Shell } from '../components/Q2Shell';
import { ApplicantsTable } from '../components/ApplicantsTable';

/** All Applicants — "10 applications across all jobs", with the three relevance tabs. */
export default function Q2AllApplicantsPage() {
  const { t } = useTranslation('common');
  return (
    <Q2Shell title={t('q2.title')} subtitle={t('q2.subtitle')}>
      <ApplicantsTable
        bucket="queue"
        title={t('q2.applicants.title')}
        subtitleKey="q2.applicants.subtitle"
        showTabs
      />
    </Q2Shell>
  );
}
