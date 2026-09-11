import { useTranslation } from 'react-i18next';
import { CandidateQueue } from '../components/CandidateQueue';
import { Q1Shell } from '../components/Q1Shell';

/** The queue pinned to the "no-response" tab — one of the four filtered sidebar screens. */
export default function Q1NoResponsePage() {
  const { t } = useTranslation('common');
  return (
    <Q1Shell title={t('q1.noResponse.title')} subtitle={t('q1.noResponse.subtitle')}>
      <CandidateQueue tab="no-response" />
    </Q1Shell>
  );
}
