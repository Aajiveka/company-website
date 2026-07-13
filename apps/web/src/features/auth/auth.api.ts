import { api } from '@/lib/axios';
import type {
  AuthSession,
  AuthUser,
  ForgotValues,
  LoginValues,
  RegisterValues,
  ResetValues,
} from './auth.types';

/** Auth service — thin wrappers over the /auth API endpoints. */
export const authApi = {
  login: (values: LoginValues) =>
    api.post<AuthSession>('/auth/login', values).then((r) => r.data),

  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  forgotPassword: (values: ForgotValues) =>
    api.post<{ message: string }>('/auth/forgot-password', values).then((r) => r.data),

  resetPassword: (values: ResetValues) =>
    api.post<{ message: string }>('/auth/reset-password', values).then((r) => r.data),

  register: (values: RegisterValues) =>
    api.post<{ userId: number; otpRequired: boolean }>('/auth/register', values).then((r) => r.data),

  verifyOtp: (payload: { userId: number; otp: string }) =>
    api.post<AuthSession>('/auth/verify-otp', payload).then((r) => r.data),
};
