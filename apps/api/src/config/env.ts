import 'dotenv/config';
import { z } from 'zod';

/** Validated, typed environment. Fails fast on misconfiguration. */
const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  JWT_SECRET: z.string().min(1).default('change-me-in-production'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  DB_SERVER: z.string().default('localhost'),
  DB_NAME: z.string().default('db_aajiveka'),
  DB_USER: z.string().default('sa'),
  DB_PASSWORD: z.string().default(''),
  DB_PORT: z.coerce.number().default(1433),
  DB_ENCRYPT: z.coerce.boolean().default(true),
  DB_TRUST_SERVER_CERT: z.coerce.boolean().default(true),

  TWOFACTOR_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
