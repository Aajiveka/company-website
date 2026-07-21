import { z } from 'zod';
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
export const loginSchema = z.object({
  userName: z.string().min(1, 'Username, email or mobile is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

// Backend forgot-password keys off the username (or registered mobile), not email.
export const forgotSchema = z.object({
  userName: z.string().min(1, 'Enter your username or registered mobile'),
});
export type ForgotValues = z.infer<typeof forgotSchema>;

// Backend expects `{ token, newPassword }`, password ≥ 8 chars. `confirm` is client-side only.
export const resetSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
export type ResetValues = z.infer<typeof resetSchema>;

// Full registration form. The backend's /auth/register only takes the mobile (it texts an
// OTP); the name/email/password are carried to /auth/verify-otp, which persists them when the
// account is created.
export const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  mobile: z.string().regex(/^\d{10}$/, 'Enter a 10-digit mobile number'),
  password: z.string().min(8, 'At least 8 characters'),
});
export type RegisterValues = z.infer<typeof registerSchema>;

// OTP verification step — carries the profile so it is saved at account creation.
export const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  fullName: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
});
export type VerifyOtpValues = z.infer<typeof verifyOtpSchema>;
