import { useTranslation } from 'react-i18next';
import { Q2Shell } from '../components/Q2Shell';
import { ApplicantsTable } from '../components/ApplicantsTable';

/** Sent back to Q1 — the counterpart bucket to Forwarded to Q3. */
export default function Q2SentBackPage() {
  const { t } = useTranslation('common');
  return (
    <Q2Shell title={t('q2.title')} subtitle={t('q2.subtitle')}>
      <ApplicantsTable
        bucket="sentBack"
        title={t('q2.sentBack.title')}
        subtitleKey="q2.sentBack.subtitle"
        showTabs={false}
      />
    </Q2Shell>
  );
}
