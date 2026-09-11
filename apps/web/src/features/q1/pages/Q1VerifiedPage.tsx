import { useTranslation } from 'react-i18next';
import { CandidateQueue } from '../components/CandidateQueue';
import { Q1Shell } from '../components/Q1Shell';

/** The queue pinned to the "verified" tab — one of the four filtered sidebar screens. */
export default function Q1VerifiedPage() {
  const { t } = useTranslation('common');
  return (
    <Q1Shell title={t('q1.verified.title')} subtitle={t('q1.verified.subtitle')}>
      <CandidateQueue tab="verified" />
    </Q1Shell>
  );
}
