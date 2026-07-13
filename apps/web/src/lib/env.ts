/**
 * Typed access to Vite env vars. Centralised so the rest of the app never
 * touches `import.meta.env` directly.
 */
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) ?? '/api',
  useMocks: (import.meta.env.VITE_USE_MOCKS as string) === '1',
} as const;
