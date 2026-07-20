import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma 7 talks to PostgreSQL through a driver adapter rather than its own engine,
 * so the client has to be constructed with one. Shared by the Nest PrismaService and
 * the one-shot data migration.
 */
export function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
