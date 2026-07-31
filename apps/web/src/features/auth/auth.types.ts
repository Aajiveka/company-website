import { z } from 'zod';
import type { TFunction } from 'i18next';
import type { RoleId } from '@/types/roles';

export interface AuthUser {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
  roleId: RoleId;
  /** Whether the candidate has completed post-registration onboarding. */
  isOnboarded?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/** Login form schema (React Hook Form + Zod). */
export const loginSchema = (t: TFunction) =>
  z.object({
    userName: z.string().min(1, t('validation.usernameRequired')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });
export type LoginValues = z.infer<ReturnType<typeof loginSchema>>;

// Backend forgot-password keys off the username (or registered mobile), not email.
export const forgotSchema = (t: TFunction) =>
  z.object({
    userName: z.string().min(1, t('validation.enterUsernameOrMobile')),
  });
export type ForgotValues = z.infer<ReturnType<typeof forgotSchema>>;

// Backend expects `{ token, newPassword }`, password ≥ 8 chars. `confirm` is client-side only.
export const resetSchema = (t: TFunction) =>
  z
    .object({
      token: z.string().min(1),
      newPassword: z.string().min(8, t('validation.min8Chars')),
      confirm: z.string().min(1, t('validation.confirmPassword')),
    })
    .refine((v) => v.newPassword === v.confirm, {
      message: t('validation.passwordsMismatch'),
      path: ['confirm'],
    });
export type ResetValues = z.infer<ReturnType<typeof resetSchema>>;

// Full registration form. The whole form goes to /auth/register, which emails a 6-digit code
// and holds the registration server-side; the account is created by /auth/verify-otp. Bounds
// mirror the API DTO so the same input is rejected in both places.
export const registerSchema = (t: TFunction) =>
  z
    .object({
      fullName: z.string().min(2, t('validation.enterFullName')).max(100),
      email: z.string().email(t('validation.validEmail')).max(100),
      /** ISO 3166-1 alpha-2. Picks the dial code; only the dial code is submitted. */
      country: z.string().length(2),
      // 4–15 is the E.164 envelope: no national number is shorter than four digits, and 15 is
      // the standard's ceiling as well as the width of RegistrationMobileNo.
      mobile: z.string().regex(/^\d{4,15}$/, t('validation.mobileDigits')),
      password: z.string().min(8, t('validation.min8Chars')).max(72),
    })
    // India is the primary market and its numbers are always exactly ten digits, so a nine-digit
    // typo should still be caught there rather than passed to the API. Everywhere else the
    // range above is all we can assert without shipping per-country numbering plans.
    .superRefine((v, ctx) => {
      if (v.country === 'IN' && !/^\d{10}$/.test(v.mobile)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mobile'],
          message: t('validation.mobile10Digits'),
        });
      }
    });
export type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;

/**
 * What /auth/register hands back. `registrationToken` is the handle for verify and resend —
 * the pending signup lives on the server, so this is the only thing the client needs to keep.
 * `devCode` is present only outside production.
 */
export interface RegistrationChallenge {
  otpRequired: boolean;
  registrationToken: string;
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  maxAttempts: number;
  devCode?: string;
}

// OTP verification step — addresses the registration by its handle, never by email.
export const verifyOtpSchema = (t: TFunction) =>
  z.object({
    registrationToken: z.string().regex(/^[a-f0-9]{64}$/),
    code: z.string().regex(/^\d{6}$/, t('validation.otpCode')),
  });
export type VerifyOtpValues = z.infer<ReturnType<typeof verifyOtpSchema>>;
