import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { tokenStorage } from './tokenStorage';

/**
 * Central Axios instance.
 * - Request interceptor attaches the JWT access token.
 * - Response interceptor performs a one-shot token refresh on 401, then
 *   replays the original request. If refresh fails, it clears the session
 *   and redirects to /login.
 * - Retries transient errors (408, 429, 500, 502, 503, 504) up to 2 times
 *   with exponential backoff.
 * - 30-second request timeout.
 */
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ---------------------------------------------------------------------------
// Request interceptor — attach JWT
// ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — refresh, retry, error normalisation
// ---------------------------------------------------------------------------
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    // Use a bare axios call so we don't recurse through this interceptor.
    const { data } = await axios.post(`${env.apiBaseUrl}/auth/refresh`, {
      refreshToken: refresh,
    });
    tokenStorage.setAccess(data.accessToken);
    if (data.refreshToken) tokenStorage.setRefresh(data.refreshToken);
    return data.accessToken as string;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

/** Status codes that indicate a transient server issue worth retrying. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: AxiosError): boolean {
  // Network error (offline, DNS failure, CORS) — no response at all
  if (!error.response) return true;
  return RETRYABLE_STATUSES.has(error.response.status);
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (!original) return Promise.reject(error);

    // --- 401: Token refresh flow (unchanged) ---
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Refresh failed — bounce to login.
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
      return Promise.reject(error);
    }

    // --- Transient errors: retry with exponential backoff ---
    if (isRetryable(error)) {
      const count = original._retryCount ?? 0;
      if (count < MAX_RETRIES) {
        original._retryCount = count + 1;
        // Exponential backoff: 1s, 2s. For 429, respect Retry-After header.
        let backoff = 1000 * Math.pow(2, count);
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) backoff = Number(retryAfter) * 1000 || backoff;
        }
        await delay(backoff);
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Error message extraction helper
// ---------------------------------------------------------------------------

/**
 * Extracts a user-friendly message from an API error.
 * Use this in `onError` callbacks instead of manual `isAxiosError` checks.
 *
 * @example
 * onError: (e) => notify(getErrorMessage(e, 'Could not save'), 'error')
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!axios.isAxiosError(error)) return fallback;

  // Network / timeout — no response from server
  if (!error.response) {
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (!navigator.onLine) return 'You appear to be offline. Check your connection.';
    return 'Unable to reach the server. Please try again later.';
  }

  // Server returned an error response — try to extract the message
  const data = error.response.data as { message?: string | string[] } | undefined;
  if (data?.message) {
    return Array.isArray(data.message) ? data.message[0] : data.message;
  }

  // Status-specific defaults
  const status = error.response.status;
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 409) return 'This action conflicts with existing data.';
  if (status === 422) return 'The submitted data is invalid. Please check and try again.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Server error. Please try again later.';

  return fallback;
}
