import type { JobAction } from '../admin.types';

/** The wording for the two job transitions an admin owns, shared by the list and detail pages. */
export const JOB_ACTION_COPY: Record<JobAction, { verb: string; title: string; body: string }> = {
  close: {
    verb: 'Close',
    title: 'Close these jobs?',
    body: 'They disappear from job search and stop taking applications. Existing applications carry on through the pipeline. You can reopen them later.',
  },
  reopen: {
    verb: 'Reopen',
    title: 'Reopen these jobs?',
    body: 'They return to job search and accept applications again.',
  },
};
