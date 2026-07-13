/**
 * Access + refresh token storage.
 *
 * The access token lives in memory (XSS-safer); the refresh token is persisted
 * so a page reload can silently re-authenticate. In production the refresh
 * token should ideally be an httpOnly cookie set by the API — this module is
 * the single seam to swap that in without touching call sites.
 */
const REFRESH_KEY = 'aaj.refresh';

let accessToken: string | null = null;

export const tokenStorage = {
  getAccess: () => accessToken,
  setAccess: (t: string | null) => {
    accessToken = t;
  },
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string | null) => {
    if (t) localStorage.setItem(REFRESH_KEY, t);
    else localStorage.removeItem(REFRESH_KEY);
  },
  clear: () => {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
};
