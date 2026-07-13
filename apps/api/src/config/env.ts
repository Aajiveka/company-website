import 'dotenv/config';
import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';

/**
 * A signing secret must be real in production. The previous config defaulted JWT_SECRET to
 * 'change-me-in-production' and would boot happily with it.
 */
const secret = (name: string) =>
  isProd
    ? z.string().min(32, `${name} must be at least 32 chars in production`)
    : z.string().min(32).default(`dev-only-${name.toLowerCase()}-never-use-in-production`);

/** Validated, typed environment. Fails fast on misconfiguration. */
const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Access and refresh tokens are signed with SEPARATE secrets. The Express API signed both
  // with one key and verified them identically, so an access token was accepted as a refresh
  // token and vice versa.
  JWT_ACCESS_SECRET: secret('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: secret('JWT_REFRESH_SECRET'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  TWOFACTOR_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const detail = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment:\n${detail}`);
}

export const env = parsed.data;
export type Env = typeof env;
