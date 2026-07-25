import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { tokenStorage } from './tokenStorage';
import { captureError } from './errorTracking';

/**
 * Central Axios instance.
 * - Request interceptor attaches the JWT access token.
 * - Response interceptor performs a one-shot token refresh on 401, then
 *   replays the original request. If refresh fails, it clears the session
 *   and redirects to /login.
 */
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

// ---------- helpers ----------

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// ---------- request interceptors ----------

// Attach JWT access token.
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Attach CSRF token on state-changing requests.
api.interceptors.request.use((config) => {
  if (config.method && !['get', 'head', 'options'].includes(config.method)) {
    const csrfToken =
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ??
      getCookie('XSRF-TOKEN');
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
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

interface RateLimitConfig extends InternalAxiosRequestConfig {
  _rateLimitRetried?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (RetriableConfig & RateLimitConfig) | undefined;

    // --- 429 Rate-limit handling (one retry) ---
    if (error.response?.status === 429 && original && !original._rateLimitRetried) {
      original._rateLimitRetried = true;
      const retryAfterHeader = error.response.headers['retry-after'];
      const retryAfterSecs = retryAfterHeader ? Number(retryAfterHeader) : 1;
      const delay = Number.isFinite(retryAfterSecs) && retryAfterSecs > 0 ? retryAfterSecs : 1;
      console.warn(`Too many requests, retrying after ${delay}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      return api(original);
    }

    if (error.response?.status === 401 && original && !original._retry) {
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
    }
    if (error.response && error.response.status >= 500) {
      captureError(error, {
        url: original?.url,
        method: original?.method,
        status: error.response.status,
      });
    }
    return Promise.reject(error);
  },
);
