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

  // The refresh token has to go in the body — that is what the API revokes. Posting an
  // empty body means logout revokes nothing and the token stays valid until it expires.
  logout: (refreshToken: string | null) =>
    api.post('/auth/logout', { refreshToken: refreshToken ?? undefined }).then((r) => r.data),

  forgotPassword: (values: ForgotValues) =>
    api.post<{ message: string }>('/auth/forgot-password', values).then((r) => r.data),

  // Backend consumes `{ token, newPassword }` — send only those two.
  resetPassword: (values: ResetValues) =>
    api
      .post<{ message: string }>('/auth/reset-password', {
        token: values.token,
        newPassword: values.newPassword,
      })
      .then((r) => r.data),

  // The backend's register only takes the mobile (it texts an OTP). The rest of the full
  // form is carried to verify-otp below. `devCode` is returned only outside production so the
  // OTP can be entered without a live SMS gateway.
  register: (values: RegisterValues) =>
    api
      .post<{ otpRequired: boolean; devCode?: string }>('/auth/register', { mobile: values.mobile })
      .then((r) => r.data),

  // Verify the OTP and receive a full session. The profile fields are persisted server-side
  // when the account is created.
  verifyOtp: (payload: {
    mobile: string;
    code: string;
    fullName?: string;
    email?: string;
    password?: string;
  }) => api.post<AuthSession>('/auth/verify-otp', payload).then((r) => r.data),
};
