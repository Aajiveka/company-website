import { z } from 'zod';
import type { TFunction } from 'i18next';
import type { RoleId } from '@/types/roles';

export interface AuthUser {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
  roleId: RoleId;
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

// Full registration form. The backend's /auth/register only takes the mobile (it texts an
// OTP); the name/email/password are carried to /auth/verify-otp, which persists them when the
// account is created.
export const registerSchema = (t: TFunction) =>
  z.object({
    fullName: z.string().min(2, t('validation.enterFullName')),
    email: z.string().email(t('validation.validEmail')),
    mobile: z.string().regex(/^\d{10}$/, t('validation.mobile10Digits')),
    password: z.string().min(8, t('validation.min8Chars')),
  });
export type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;

// OTP verification step — carries the profile so it is saved at account creation.
export const verifyOtpSchema = (t: TFunction) =>
  z.object({
    mobile: z.string().regex(/^\d{10}$/),
    code: z.string().regex(/^\d{6}$/, t('validation.otpCode')),
    fullName: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
  });
export type VerifyOtpValues = z.infer<ReturnType<typeof verifyOtpSchema>>;
