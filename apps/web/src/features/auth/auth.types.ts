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
  userName: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(6, 'At least 6 characters'),
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
export type ResetValues = z.infer<typeof resetSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  mobile: z.string().regex(/^\d{10}$/, 'Enter a 10-digit mobile number'),
  password: z.string().min(6, 'At least 6 characters'),
});
export type RegisterValues = z.infer<typeof registerSchema>;
