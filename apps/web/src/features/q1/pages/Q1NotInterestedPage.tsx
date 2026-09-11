import { useTranslation } from 'react-i18next';
import { CandidateQueue } from '../components/CandidateQueue';
import { Q1Shell } from '../components/Q1Shell';

/** The queue pinned to the "not-interested" tab — one of the four filtered sidebar screens. */
export default function Q1NotInterestedPage() {
  const { t } = useTranslation('common');
  return (
    <Q1Shell title={t('q1.notInterested.title')} subtitle={t('q1.notInterested.subtitle')}>
      <CandidateQueue tab="not-interested" />
    </Q1Shell>
  );
}
