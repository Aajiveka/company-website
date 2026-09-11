import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CandidateQueue } from '../components/CandidateQueue';
import { Q1Shell } from '../components/Q1Shell';
import type { QueueTab } from '../q1.types';

/** Candidates — the full queue with the tab strip, no stat cards. */
export default function Q1CandidatesPage() {
  const { t } = useTranslation('common');
  const [params] = useSearchParams();
  const [tab, setTab] = useState<QueueTab>('all');

  return (
    <Q1Shell title={t('q1.candidates.title')} subtitle={t('q1.candidates.subtitle')}>
      {/* The topbar's quick search routes here with ?search=, so the panel opens pre-filtered. */}
      <CandidateQueue
        key={params.get('search') ?? ''}
        tab={tab}
        onTabChange={setTab}
        showTabs
        initialSearch={params.get('search') ?? ''}
      />
    </Q1Shell>
  );
}
