import { api } from '@/lib/axios';
import { COUNTRIES, DEFAULT_DIAL_CODE } from '@/lib/countryCodes';
import type {
  AuthSession,
  AuthUser,
  ForgotValues,
  LoginValues,
  RegisterValues,
  RegistrationChallenge,
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

  // Posts the whole form. Nothing is persisted yet — the backend emails a 6-digit code and
  // holds the registration for 10 minutes, returning the handle that the two calls below use.
  // The form tracks the country by ISO code so it can show the right flag; the API only wants
  // the dial code, which is what RegistrationCountryCode stores.
  register: ({ country, ...values }: RegisterValues) =>
    api
      .post<RegistrationChallenge>('/auth/register', {
        ...values,
        countryCode: COUNTRIES.find((c) => c.iso2 === country)?.dial ?? DEFAULT_DIAL_CODE,
      })
      .then((r) => r.data),

  // Verifies the emailed code, which is what actually creates the account, and returns a
  // full session. The profile was captured at register time and is persisted server-side.
  verifyOtp: (payload: { registrationToken: string; code: string }) =>
    api.post<AuthSession>('/auth/verify-otp', payload).then((r) => r.data),

  // Issues a fresh code and invalidates the previous one. 429s while the 60-second
  // per-address cooldown is still running.
  resendOtp: (registrationToken: string) =>
    api
      .post<Omit<RegistrationChallenge, 'registrationToken'>>('/auth/resend-otp', {
        registrationToken,
      })
      .then((r) => r.data),
};
