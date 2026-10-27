/**
 * Creates an Admin login on a database that has none — the first admin of a fresh
 * production install, where the seed (without SEED_DEMO_USERS) creates no logins at all.
 * Every later admin and staff account is created from the admin panel instead.
 *
 * Run from apps/api, against whichever environment the loaded .env points at:
 *   npx tsx scripts/create-admin.ts --username jane --name "Jane Doe" --email jane@example.com
 *
 * No password is taken or printed. The script prints a single-use set-password link (valid
 * for 24 hours) for the new admin to open; only its hash is stored. Refuses to run when an
 * active admin already exists unless --force is given, so it cannot be used to quietly mint
 * extra admin accounts on a live system.
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { env } from '../src/config/env';
import { Role } from '../src/shared/roles';
import { createStaffLogin, issuePasswordResetToken } from '../src/modules/admin/staff-account';

@Module({ imports: [PrismaModule] })
class CreateAdminModule {}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const userName = arg('username');
  const fullName = arg('name');
  const email = arg('email');
  if (!userName || !fullName || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('usage: npx tsx scripts/create-admin.ts --username <u> --name "<full name>" --email <address> [--force]');
    process.exit(2);
  }

  const app = await NestFactory.createApplicationContext(CreateAdminModule, { logger: ['error'] });
  try {
    const db = app.get(PrismaService).client;
    const existing = await db.secUser.count({
      where: { active: '1', SecMapUserRoles: { some: { roleId: Role.Admin } } },
    });
    if (existing && !process.argv.includes('--force')) {
      console.error(`${existing} active admin account(s) already exist — create further admins from the admin panel, or pass --force.`);
      process.exitCode = 1;
      return;
    }

    const userId = await createStaffLogin(db, { userName, fullName, email, roleId: Role.Admin, createdBy: 0 });
    const token = await issuePasswordResetToken(db, userId, 24 * 60 * 60 * 1000);
    await db.auditLog.create({
      data: {
        userID: null,
        action: 'admin.user_created',
        entity: 'SecUser',
        entityID: String(userId),
        detail: JSON.stringify({ userName, roleId: Role.Admin, via: 'scripts/create-admin.ts' }),
      },
    });

    console.log(`Created admin "${userName}" (user ${userId}).`);
    console.log('Open this link within 24 hours to set the password (single use):');
    console.log(`  ${env.APP_URL}/reset-password?token=${token}`);
  } finally {
    await app.close();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
