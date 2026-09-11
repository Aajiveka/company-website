import { useTranslation } from 'react-i18next';
import { Q2Shell } from '../components/Q2Shell';
import { EmployerJobsTable } from '../components/EmployerJobsTable';

/**
 * The Employer Jobs screen — the same card the dashboard shows, on its own.
 *
 * The Figma's Employer Jobs frame is the dashboard frame with the five KPI cards removed and
 * nothing else changed, so this renders the shared table rather than a second copy of it.
 */
export default function Q2EmployerJobsPage() {
  const { t } = useTranslation('common');
  return (
    <Q2Shell title={t('q2.title')} subtitle={t('q2.subtitle')}>
      <EmployerJobsTable />
    </Q2Shell>
  );
}
