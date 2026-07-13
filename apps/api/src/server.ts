import { createApp } from './app';
import { env } from '@/config/env';

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  // eslint-disable-next-line no-console
  console.log('[api] DB connects lazily on first proc call — see apps/api/.env');
});
