import { isAxiosError } from 'axios';
import { CardMessage, Q3Card } from './primitives';

/**
 * The error state of a Q3 application page (decisions, scheduling, documents).
 *
 * Q3 only holds applications Q2 referred to it. An application the company took to interview
 * straight from its applicant list has no referral, so these pages answer 404 — which used to
 * read "check your connection and try again" with a Retry that could never succeed.
 */
export function ApplicationLoadError({ error, what, onRetry }: { error: unknown; what: string; onRetry: () => void }) {
  if (isAxiosError(error) && error.response?.status === 404) {
    return (
      <Q3Card>
        <CardMessage
          title="This application isn't in Q3"
          body="It was never referred to Q3 by Q2 — for example, the company scheduled the interview straight from its applicant list. Its interviews and decision are handled by the company directly."
        />
      </Q3Card>
    );
  }
  return (
    <Q3Card>
      <CardMessage
        title={`Couldn't load this ${what}`}
        body="Check your connection and try again."
        action={{ label: 'Retry', onClick: onRetry }}
      />
    </Q3Card>
  );
}
