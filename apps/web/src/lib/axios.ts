import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { tokenStorage } from './tokenStorage';

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

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
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

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
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
    return Promise.reject(error);
  },
);
