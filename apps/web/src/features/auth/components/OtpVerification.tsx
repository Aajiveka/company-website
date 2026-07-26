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
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Button, useToast } from '@/components/ui';

interface OtpVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OtpVerification({
  email,
  onVerified,
  onBack,
}: OtpVerificationProps) {
  const { t } = useTranslation('auth');
  const { notify } = useToast();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // ---- countdown timer ----
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // ---- mutations ----
  const verifyMutation = useMutation({
    mutationFn: async (otp: string) => {
      await api.post('/auth/verify-otp', { email, otp });
    },
    onSuccess: () => {
      notify(t('otp.verified'), 'success');
      onVerified();
    },
    onError: () => {
      notify(t('otp.verifyFailed'), 'error');
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/resend-otp', { email });
    },
    onSuccess: () => {
      notify(t('otp.resent'), 'success');
      setCountdown(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    },
    onError: () => {
      notify(t('otp.resendFailed'), 'error');
    },
  });

  // ---- helpers ----
  const focusInput = useCallback((index: number) => {
    inputsRef.current[index]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH;

  const handleSubmit = () => {
    if (isComplete) verifyMutation.mutate(otp);
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {t('otp.heading')}
      </h2>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        {t('otp.enterCode')}{' '}
        <span className="font-medium text-gray-900 dark:text-gray-200">
          {t('otp.sentTo', { email })}
        </span>
      </p>

      {/* OTP inputs */}
      <div className="flex gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className={cn(
              'h-12 w-10 rounded-lg border text-center text-lg font-semibold',
              'border-gray-300 bg-white text-gray-900',
              'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30',
              'dark:focus:border-blue-400 dark:focus:ring-blue-400/30',
            )}
            aria-label={`${t('otp.heading')} ${i + 1}`}
          />
        ))}
      </div>

      {/* Verify button */}
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!isComplete || verifyMutation.isPending}
      >
        {verifyMutation.isPending ? t('otp.verifying') : t('otp.verify')}
      </Button>

      {/* Resend / timer */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {countdown > 0 ? (
          <span>{t('otp.resendIn', { seconds: countdown })}</span>
        ) : (
          <button
            type="button"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
          >
            {t('otp.resend')}
          </button>
        )}
      </div>

      {/* Back link */}
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
