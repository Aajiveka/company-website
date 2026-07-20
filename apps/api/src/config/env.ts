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
  REDIS_URL: z.string().default('redis://localhost:16379'),

  /** Where password-reset links point. */
  APP_URL: z.string().default('http://localhost:5173'),

  // File storage. Local writes to disk and serves through the API; s3 keeps the bucket
  // private and hands out short-lived signed URLs.
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().default('./storage'),
  S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),

  // Access and refresh tokens are signed with SEPARATE secrets. The Express API signed both
  // with one key and verified them identically, so an access token was accepted as a refresh
  // token and vice versa.
  JWT_ACCESS_SECRET: secret('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: secret('JWT_REFRESH_SECRET'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // BillDesk. Without these, /payments/orders returns a clear 400 rather than pretending.
  // The values in the legacy Web.config are COMPROMISED and must be rotated.
  BILLDESK_BASE_URL: z.string().default('https://api.billdesk.com'),
  BILLDESK_CLIENT_ID: z.string().optional(),
  BILLDESK_MERCHANT_ID: z.string().optional(),
  BILLDESK_SECRET_KEY: z.string().optional(),

  // Notification drivers. 'log' writes to stdout (dev default); the real drivers need credentials.
  SMS_DRIVER: z.enum(['twofactor', 'sns', 'log']).default('log'),
  EMAIL_DRIVER: z.enum(['smtp', 'ses', 'log']).default('log'),

  // AWS SNS (SMS_DRIVER=sns)
  SNS_SENDER_ID: z.string().optional(),

  // AWS SES (EMAIL_DRIVER=ses)
  SES_FROM_EMAIL: z.string().optional(),

  // 2Factor.in (SMS_DRIVER=twofactor)
  TWOFACTOR_API_KEY: z.string().optional(),

  // SMTP (EMAIL_DRIVER=smtp)
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
