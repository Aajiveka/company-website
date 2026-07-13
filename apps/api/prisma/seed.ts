/**
 * Seeds a fresh database.
 *
 *   npm run db:seed --workspace apps/api
 *
 * Master/lookup data is REAL — the pipe-separated files in db/seed/ were dumped from the
 * restored db_aajiveka.bak, so the designations, cities, statuses and roles are the
 * application's actual reference data, not invented values.
 *
 * Demo logins are only created when SEED_DEMO_USERS=1. They exist so CI (and a local dev
 * database) can exercise the three roles end to end. They must never be created in
 * production, which is why they are off by default.
 *
 * For a real migration of the legacy DATA, use prisma/migrate-data.ts instead — that reads
 * the restored SQL Server directly.
 */
import 'dotenv/config';
import argon2 from 'argon2';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createPrismaClient } from '../src/prisma/prisma.client';

const prisma = createPrismaClient();
const SEED_DIR = resolve(__dirname, '../../../db/seed');

/** Load order — parents before children (states need countries, cities need states). */
const ORDER = [
  'tblSecRoles',
  'tblMstrCountry',
  'tblMstrStatus',
  'tblMstrFunctions',
  'tblMstrSubFunctions',
  'tblMstrSkills',
  'tblMstrTags',
  'tblMstrDesignation',
  'tblMstrIndustryType',
  'tblMstrEmpType',
  'tblMstrWorkMode',
  'tblMstrGender',
  'tblMstrEducationType',
  'tblMstrDocumentType',
  'tblMstrDocuments',
  'tblMstrJobMappingStatus',
  'tblMstrState',
  'tblMstrCily',
];

function parsePsv(file: string): Record<string, string>[] {
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split('|').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split('|').map((c) => c.trim());
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
}

async function seedMasterData() {
  const available = existsSync(SEED_DIR) ? readdirSync(SEED_DIR) : [];
  for (const table of ORDER) {
    const file = join(SEED_DIR, `${table}.psv`);
    if (!available.includes(`${table}.psv`)) continue;

    const rows = parsePsv(file).map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, v === 'NULL' || v === '' ? null : v]),
      ),
    );
    if (!rows.length) continue;

    const cols = Object.keys(rows[0]);
    const quoted = cols.map((c) => `"${c}"`).join(', ');
    const values = rows
      .map(
        (r) =>
          `(${cols
            .map((c) => (r[c] === null ? 'NULL' : `'${String(r[c]).replace(/'/g, "''")}'`))
            .join(', ')})`,
      )
      .join(', ');

    // ON CONFLICT DO NOTHING so the seed is safe to re-run.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${table}" (${quoted}) VALUES ${values} ON CONFLICT DO NOTHING`,
    );
    console.log(`  ${table.padEnd(28)} ${rows.length} rows`);
  }

  // Advance the identity sequences past the seeded ids.
  for (const table of ORDER) {
    const pk = await prisma
      .$queryRawUnsafe<{ col: string }[]>(
        `SELECT a.attname AS col FROM pg_index i
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
         WHERE i.indrelid = '"${table}"'::regclass AND i.indisprimary`,
      )
      .catch(() => []);
    for (const { col } of pk) {
      await prisma
        .$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', '${col}'),
             COALESCE((SELECT MAX("${col}") FROM "${table}"), 1), true)`,
        )
        .catch(() => undefined);
    }
  }
}

/** The three logins the e2e suite drives. Password == username, as in the legacy data. */
const DEMO_USERS = [
  // The candidate gets a real subscriber profile, because a login on its own has no
  // candidate identity — tblSecUser.SubscriberID has to be set explicitly.
  { userName: 'anuj', roleId: 1, descr: 'anuj', email: '' },
  { userName: 'qc1', roleId: 2, descr: 'Aajiveka Admin', email: 'admin@aajiveka.com' },
  { userName: 'anuj@aajiveka.com', roleId: 4, descr: 'anuj garg', email: 'anuj@aajiveka.com' },
];

async function seedDemoUsers() {
  const client = await prisma.clientMstr.findFirst({ select: { clientID: true } });
  const clientId =
    client?.clientID ??
    (
      await prisma.clientMstr.create({
        data: {
          clientName: 'aajiveka',
          clientAddress: '',
          pIN: 122001,
          contactNo: '1234',
          emailID: 'info@aajiveka.com',
          cityID: 3,
          industryTypeID: 4,
          companyDescr: 'test company aajiveka',
          companyWebsite: '',
          companyLogo: '',
          timestampIns: new Date(),
          loginIDIns: 0,
        },
        select: { clientID: true },
      })
    ).clientID;

  for (const demo of DEMO_USERS) {
    if (await prisma.secUser.findFirst({ where: { userName: demo.userName } })) continue;

    await prisma.$transaction(async (tx) => {
      // A candidate needs a registration + CV, or /candidates/me has nothing to return.
      let subscriberId: bigint | null = null;
      if (demo.roleId === 1) {
        const reg = await tx.subscriberRegistration.create({
          data: {
            registrationMobileNo: '9873174794',
            registrationCountryCode: '+91',
            registrationIPNo: '',
            registrationDateTime: new Date(),
            flgCVUploaded: 0,
            flgstatus: 0,
          },
          select: { subscriberID: true },
        });
        subscriberId = reg.subscriberID;
        await tx.subscriberCVDetails.create({
          data: {
            subscriberID: reg.subscriberID,
            fullName: demo.descr,
            emailID: 'anuj@example.com',
            mobileNo1: '9873174794',
            gender: 'M',
            addressLine1: '',
            totalExp: 1,
            timestampIns: new Date(),
            loginIDIns: 0,
          },
        });
      }

      const person = await tx.mstrPerson.create({
        data: {
          descr: demo.descr,
          emailID: demo.email,
          nodeType: 100,
          flgActive: 1,
          tImestampIns: new Date(),
          loginIDIns: 0,
          // Only the employer is attached to a company.
          clientID: demo.roleId === 4 ? clientId : null,
        },
        select: { personNodeID: true },
      });
      const user = await tx.secUser.create({
        data: {
          userName: demo.userName,
          password: await argon2.hash(demo.userName, { type: argon2.argon2id }),
          active: '1',
          pwdStatus: 1,
          nodeID: person.personNodeID,
          nodeType: 100,
          subscriberID: subscriberId,
        },
        select: { userID: true },
      });
      await tx.secMapUserRoles.create({
        data: {
          userID: user.userID,
          roleId: demo.roleId,
          userNodeId: person.personNodeID,
          userNodeType: 100,
        },
      });
    });
    console.log(`  demo user: ${demo.userName} (role ${demo.roleId})`);
  }
}

async function main() {
  console.log('seeding master data (real values from the restored backup)');
  await seedMasterData();

  if (process.env.SEED_DEMO_USERS === '1') {
    console.log('\nseeding demo users (SEED_DEMO_USERS=1 — never do this in production)');
    await seedDemoUsers();
  } else {
    console.log('\nskipping demo users (set SEED_DEMO_USERS=1 for dev/CI)');
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
