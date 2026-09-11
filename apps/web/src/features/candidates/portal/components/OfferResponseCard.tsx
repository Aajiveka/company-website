import { FileSignature } from 'lucide-react';
import { Badge, Button, statusTone, useToast } from '@/components/ui';
import { useOffer, useRespondToOffer } from '@/features/recruitment/recruitment.api';

/**
 * The candidate's answer to an offer letter.
 *
 * An employer could create and send an offer, and `POST /offers/:id/respond` — the one
 * endpoint that is `@Roles(Subscriber, Admin)` — had no caller, so the loop never closed:
 * the offer went out and could not be accepted or rejected anywhere in the app.
 */
export function OfferResponseCard({ mapId }: { mapId: number }) {
  const { notify } = useToast();
  const { data: offer } = useOffer(mapId);
  const respond = useRespondToOffer(offer?.offerId ?? 0);

  // A Draft offer has not been sent yet — the candidate must not see it.
  if (!offer || offer.status === 'Draft') return null;

  const answered = offer.status === 'Accepted' || offer.status === 'Rejected';

  const answer = (accept: boolean) =>
    respond.mutate(accept, {
      onSuccess: () =>
        notify(
          accept ? 'Offer accepted. Congratulations!' : 'Offer declined.',
          accept ? 'success' : 'info',
        ),
      onError: () => notify('Could not send your response. Please try again.', 'error'),
    });

  return (
    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-navy">
          <FileSignature className="h-4 w-4 text-primary" aria-hidden />
          Offer letter
        </p>
        <Badge tone={statusTone(offer.status)}>{offer.status}</Badge>
      </div>

      {offer.joiningDate && (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
          Joining date: {new Date(offer.joiningDate).toLocaleDateString('en-IN')}
        </p>
      )}

      {answered ? (
        <p className="mt-2 text-xs text-gray-500">You have already responded to this offer.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={respond.isPending} onClick={() => answer(true)}>
            {respond.isPending ? 'Sending…' : 'Accept offer'}
          </Button>
          <Button variant="outline" size="sm" disabled={respond.isPending} onClick={() => answer(false)}>
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
