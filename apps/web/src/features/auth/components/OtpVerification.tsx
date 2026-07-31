import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { cn } from '@/lib/cn';
import { Button, useToast } from '@/components/ui';
import { authApi } from '../auth.api';
import type { AuthSession } from '../auth.types';

interface OtpVerificationProps {
  /** Shown to the user so they know which inbox to check. */
  email: string;
  /** Handle for the pending registration held server-side. */
  registrationToken: string;
  /** Seconds before a resend is allowed, as reported by the API. */
  resendAfterSeconds: number;
  /** Seconds before the code stops working, as reported by the API. */
  expiresInSeconds: number;
  /** Pre-filled outside production, where the API returns the code instead of relying on SMTP. */
  initialCode?: string;
  onVerified: (session: AuthSession) => void;
  onBack: () => void;
}

const OTP_LENGTH = 6;

/** Pulls the API's message out of an axios error, falling back to a translated default. */
function apiMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: string | string[] } | undefined;
  // class-validator returns an array of messages when a DTO fails.
  if (Array.isArray(data?.message)) return data.message[0] ?? fallback;
  return data?.message ?? fallback;
}

/** The cooldown the server wants, when it rejects a resend as too early. */
function retryAfterFrom(err: unknown): number | null {
  if (!isAxiosError(err)) return null;
  const data = err.response?.data as { retryAfterSeconds?: number } | undefined;
  return typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : null;
}

function splitCode(code: string): string[] {
  const digits = code.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
  return Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] ?? '');
}

export default function OtpVerification({
  email,
  registrationToken,
  resendAfterSeconds,
  expiresInSeconds,
  initialCode,
  onVerified,
  onBack,
}: OtpVerificationProps) {
  const { t } = useTranslation('auth');
  const { notify } = useToast();

  const [digits, setDigits] = useState<string[]>(() => splitCode(initialCode ?? ''));
  const [countdown, setCountdown] = useState(resendAfterSeconds);
  const [expiresIn, setExpiresIn] = useState(expiresInSeconds);
  // Shown inline rather than only as a toast: the user is looking at the input, not the corner.
  const [error, setError] = useState<string | null>(null);
  /** Set once a resend succeeds, so the screen can say the earlier code is dead. */
  const [resent, setResent] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH && digits.every(Boolean);
  const expired = expiresIn <= 0;

  // One interval drives both counters, so they cannot drift apart.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
      setExpiresIn((e) => (e > 0 ? e - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const focusInput = useCallback((index: number) => {
    inputsRef.current[index]?.focus();
  }, []);

  const verifyMutation = useMutation({
    mutationFn: (code: string) => authApi.verifyOtp({ registrationToken, code }),
    onSuccess: (session) => {
      notify(t('otp.verified'), 'success');
      onVerified(session);
    },
    onError: (err) => {
      setError(apiMessage(err, t('otp.verifyFailed')));
      setDigits(splitCode(''));
      focusInput(0);
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.resendOtp(registrationToken),
    onSuccess: (challenge) => {
      notify(t('otp.resent'), 'success');
      setError(null);
      // Resending REPLACES the code server-side, so anything from an earlier email stops
      // working. Without saying so, someone who resends and then types the code from the
      // first email gets "Incorrect code" while being certain they typed it correctly — and
      // burns real attempts finding out. The toast alone is not enough: it disappears, and
      // the second email may take longer to arrive than the toast lasts.
      setResent(true);
      setCountdown(challenge.resendAfterSeconds);
      setExpiresIn(challenge.expiresInSeconds);
      setDigits(splitCode(challenge.devCode ?? ''));
      focusInput(0);
      if (challenge.devCode) notify(`Dev OTP: ${challenge.devCode}`, 'info');
    },
    onError: (err) => {
      // A 429 carries the server's remaining cooldown — trust it over the local clock, which
      // can be behind after a sleep or a reload.
      const retryAfter = retryAfterFrom(err);
      if (retryAfter !== null) setCountdown(retryAfter);
      setError(apiMessage(err, t('otp.resendFailed')));
    },
  });

  const submit = useCallback(
    (code: string) => {
      if (code.length !== OTP_LENGTH || verifyMutation.isPending) return;
      setError(null);
      verifyMutation.mutate(code);
    },
    [verifyMutation],
  );

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    // Whether this keystroke is the one that COMPLETES the code, rather than an edit to a
    // code that was already full. Without the distinction, revising a single digit of a
    // complete code fires a submit on the spot — mid-revision, with the other digits still
    // as they were. It also made the dev pre-fill submit itself on first touch.
    const wasIncomplete = digits.some((d) => !d);
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) focusInput(index + 1);
    // Submit as soon as the last empty box is filled — the extra click adds nothing.
    const joined = next.join('');
    if (wasIncomplete && joined.length === OTP_LENGTH && next.every(Boolean)) submit(joined);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isComplete) submit(otp);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = splitCode(pasted);
    setDigits(next);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
    if (pasted.length === OTP_LENGTH) submit(pasted);
  };

  const canResend = countdown <= 0 && !resendMutation.isPending;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5">
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        {t('otp.enterCode')}{' '}
        <span className="font-medium text-gray-900 dark:text-gray-200">
          {t('otp.sentTo', { email })}
        </span>
      </p>

      {resent && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {t('otp.useLatest')}
        </p>
      )}

      <div className="flex gap-2" role="group" aria-label={t('otp.heading')}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            disabled={expired || verifyMutation.isPending}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className={cn(
              'h-12 w-10 rounded-lg border text-center text-lg font-semibold',
              'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100',
              'focus:outline-none focus:ring-2',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/30',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
            aria-label={`${t('otp.heading')} ${i + 1}`}
            aria-invalid={error ? true : undefined}
          />
        ))}
      </div>

      {/* aria-live so a screen reader hears the rejection without moving focus. */}
      <div aria-live="polite" className="min-h-5 text-center text-sm">
        {expired ? (
          <span className="text-red-600 dark:text-red-400">{t('otp.expired')}</span>
        ) : error ? (
          <span className="text-red-600 dark:text-red-400">{error}</span>
        ) : null}
      </div>

      <Button
        className="w-full"
        onClick={() => submit(otp)}
        disabled={!isComplete || expired || verifyMutation.isPending}
      >
        {verifyMutation.isPending ? t('otp.verifying') : t('otp.verify')}
      </Button>

      <div className="text-sm text-gray-600 dark:text-gray-400">
        {canResend ? (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => resendMutation.mutate()}
          >
            {t('otp.resend')}
          </button>
        ) : (
          <span>
            {resendMutation.isPending ? t('otp.resending') : t('otp.resendIn', { seconds: countdown })}
          </span>
        )}
      </div>

      <button
        type="button"
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        onClick={onBack}
      >
        &larr; {t('otp.back')}
      </button>
    </div>
  );
}
