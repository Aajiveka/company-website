import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 moved the connection URL out of schema.prisma and into this file.
 *
 * DATABASE_URL is read directly rather than through prisma's env() helper, because that
 * helper THROWS when the variable is absent — and `prisma generate` does not need a
 * database at all. It runs at image build time, where no database exists yet. Only the
 * migration commands actually connect.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    // Prisma needs a scratch database to diff a migrations directory against the schema.
    // Only used by `migrate diff` / `migrate dev` in development; never touched in prod.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL ?? '',
  },
});
