/**
 * Typed access to Vite env vars. Centralised so the rest of the app never
 * touches `import.meta.env` directly.
 */
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) ?? '/api',
  useMocks: (import.meta.env.VITE_USE_MOCKS as string) === '1',
  /**
   * Whether Google / LinkedIn sign-in is wired up. Off by default: the API has no
   * /auth/google or /auth/linkedin route, so the buttons would send people to a 404. The
   * design shows them, so they still render — disabled, with the reason — rather than
   * silently disappearing or pretending to work.
   */
  oauthEnabled: (import.meta.env.VITE_OAUTH_ENABLED as string) === '1',
} as const;
