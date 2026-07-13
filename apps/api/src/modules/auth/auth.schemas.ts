import { z } from 'zod';

export const loginSchema = z.object({
  userName: z.string().min(1),
  password: z.string().min(1),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export const forgotSchema = z.object({ email: z.string().email() });

export const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().regex(/^\d{10}$/),
  password: z.string().min(6),
});

export const verifyOtpSchema = z.object({
  userId: z.coerce.number(),
  otp: z.string().min(4),
});

export type LoginInput = z.infer<typeof loginSchema>;
