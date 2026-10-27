import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Alert, Button } from '@/components/ui';
import type { SetPasswordResult } from '../admin.types';

/**
 * What happened to a set-password link. When the API has a mail transport the link went to
 * the person and is never shown here. When it does not (EMAIL_DRIVER=log), the link is the
 * only way in, so it is shown once for the admin to hand over — it is single-use and expires.
 */
export function SetPasswordNotice({ result }: { result: SetPasswordResult }) {
  const [copied, setCopied] = useState(false);
  if (result.delivered || !result.setPasswordUrl) {
    return <Alert variant="success">A set-password link was emailed to {result.emailedTo}.</Alert>;
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.setPasswordUrl!);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Alert variant="warning">
      <p className="font-medium">Email is not configured on this server, so nothing was sent.</p>
      <p className="mt-1 text-sm">
        Give this single-use link to the person directly. It lets them choose their own password and stops
        working once used.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="block min-w-0 flex-1 break-all rounded bg-white/70 px-2 py-1.5 text-xs dark:bg-black/30">
          {result.setPasswordUrl}
        </code>
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </Alert>
  );
}
