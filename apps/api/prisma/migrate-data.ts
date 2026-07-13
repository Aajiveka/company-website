/**
 * One-shot data migration: restored SQL Server -> PostgreSQL.
 *
 * Run against the throwaway SQL Server container holding db_aajiveka.bak (see db/README.md).
 * It is idempotent: every table is truncated before load.
 *
 *   npx tsx prisma/migrate-data.ts
 *
 * Three things are fixed on the way across, rather than carried over:
 *
 *   1. Passwords. tblSecUser stores them in PLAINTEXT (spSecUserLogin compares them
 *      directly). Each one is hashed with Argon2id here, so the legacy credentials keep
 *      working while the plaintext never lands in the new database.
 *   2. Sentinel zeros. Columns like tblSubscriberJobStatusLatest.JobID use 0 to mean
 *      "no value". With a real FK that would dangle, so 0 -> NULL.
 *   3. Orphans. The legacy data violates its own (undeclared) referential integrity —
 *      e.g. 647 of 2,225 tblSecUserLogin rows point at deleted users. Rows whose parent is
 *      missing get the FK column NULLed; if the column cannot be NULL, the row is skipped
 *      and reported. Nothing is silently dropped.
 */
import 'dotenv/config';
import sql from 'mssql';
import argon2 from 'argon2';
import { createPrismaClient } from '../src/prisma/prisma.client';

const prisma = createPrismaClient();

const MSSQL = {
  server: 'localhost',
  port: 11433,
  user: 'sa',
  password: process.env.MSSQL_SA_PASSWORD ?? 'Aaj!veka_Restore_2026',
  database: 'db_aajiveka',
  options: { encrypt: false, trustServerCertificate: true },
};

/** FK columns where the legacy data uses 0 as a "no value" sentinel. */
const SENTINEL_ZERO: Record<string, string[]> = {
  tblMstrPerson: ['ClientID'],
  tblSubscriberJobStatusLatest: ['ClientID', 'JobID', 'JobMapStatusID', 'JobSubscriberMapID'],
};

type Fk = { child: string; col: string; parent: string; pcol: string };

/**
 * Parents must land before children or the FKs we just declared will reject the insert.
 * Rather than hand-maintain a list that drifts from the schema, topologically sort the
 * tables PostgreSQL actually has against the FK graph in db/foreign-keys.psv.
 */
function loadOrder(
  tables: string[],
  fks: Fk[],
  nullable: (table: string, col: string) => boolean,
): { order: string[]; deferred: Fk[] } {
  const live = new Set(tables);
  const edges = fks.filter((f) => f.child !== f.parent && live.has(f.child) && live.has(f.parent));
  const deferred: Fk[] = [];

  for (;;) {
    const active = edges.filter((e) => !deferred.includes(e));
    const deps = new Map(tables.map((t) => [t, new Set<string>()]));
    for (const e of active) deps.get(e.child)!.add(e.parent);

    const order: string[] = [];
    const done = new Set<string>();
    for (;;) {
      const ready = tables.filter((t) => !done.has(t) && [...deps.get(t)!].every((d) => done.has(d)));
      if (!ready.length) break;
      for (const t of ready) {
        order.push(t);
        done.add(t);
      }
    }
    if (order.length === tables.length) return { order, deferred };

    // The remainder is a cycle. The legacy data has a real one:
    //   ClientMstr.UserID -> SecUser -> MstrPerson.PersonNodeID -> ClientMstr.ClientID
    // Break it at a nullable FK: insert those rows with the column NULL, then fill it in a
    // second pass once every table is loaded.
    const stuck = tables.filter((t) => !done.has(t));
    const breakable = active.find(
      (e) => stuck.includes(e.child) && stuck.includes(e.parent) && nullable(e.child, e.col),
    );
    if (!breakable) throw new Error(`Unbreakable FK cycle among: ${stuck.join(', ')}`);
    deferred.push(breakable);
  }
}

async function main() {
  const pool = await new sql.ConnectionPool(MSSQL).connect();

  // Read the schema facts we already derived, straight from the DB we are migrating.
  const fks: Fk[] = [];
  for (const line of (await import('node:fs')).readFileSync('../../db/foreign-keys.psv', 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [child, col, parent, pcol] = line.split('|');
    fks.push({ child, col, parent, pcol });
  }

  // The target tables are whatever the Prisma migration actually created.
  const pgTables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       AND table_name <> '_prisma_migrations'`,
  );
  // Nullability comes from PostgreSQL — it is the schema we are loading into.
  const pgCols = await prisma.$queryRawUnsafe<{ table_name: string; column_name: string; is_nullable: string }[]>(
    `SELECT table_name, column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public'`,
  );
  const isNullable = (t: string, c: string) =>
    pgCols.some((x) => x.table_name === t && x.column_name === c && x.is_nullable === 'YES');

  const { order: ORDER, deferred } = loadOrder(pgTables.map((t) => t.table_name), fks, isNullable);
  if (deferred.length) {
    console.log('FK cycle broken by deferring (loaded NULL, filled in a second pass):');
    for (const d of deferred) console.log(`  ${d.child}.${d.col} -> ${d.parent}.${d.pcol}`);
    console.log();
  }
  const deferredFor = (t: string) => deferred.filter((d) => d.child === t).map((d) => d.col);
  const tablesInPg = new Set(ORDER);
  const skipped: Record<string, number> = {};
  const nulled: Record<string, number> = {};
  const sourceRows = new Map<string, Record<string, unknown>[]>();

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${ORDER.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`,
  );

  for (const table of ORDER) {
    const exists = await pool
      .request()
      .query(`SELECT 1 FROM sys.tables WHERE name = '${table}'`);
    if (!exists.recordset.length) continue;

    const { recordset } = await pool.request().query(`SELECT * FROM [${table}]`);
    if (!recordset.length) continue;

    // Parent key sets, so we can detect orphans without a round-trip per row.
    const tableFks = fks.filter((f) => f.child === table && tablesInPg.has(f.parent));
    const parentKeys = new Map<string, Set<unknown>>();
    for (const f of tableFks) {
      const rows = await pool.request().query(`SELECT DISTINCT [${f.pcol}] AS k FROM [${f.parent}]`);
      parentKeys.set(f.col, new Set(rows.recordset.map((r) => String(r.k))));
    }

    // Nullability of the TARGET matters, not the source: several columns are NOT NULL in
    // SQL Server but nullable here precisely so their sentinel zeros and orphans can be
    // NULLed on the way across.
    const nullableCols = new Set<string>(
      pgCols.filter((c) => c.table_name === table && c.is_nullable === 'YES').map((c) => c.column_name),
    );

    const rows: Record<string, unknown>[] = [];
    for (const raw of recordset) {
      const row: Record<string, unknown> = { ...raw };
      let skip = false;

      for (const col of SENTINEL_ZERO[table] ?? []) {
        if (row[col] === 0 || row[col] === 0n) row[col] = null;
      }

      for (const f of tableFks) {
        const v = row[f.col];
        if (v === null || v === undefined) continue;
        if (!parentKeys.get(f.col)!.has(String(v))) {
          // Orphan: the parent row does not exist.
          if (nullableCols.has(f.col)) {
            row[f.col] = null;
            nulled[`${table}.${f.col}`] = (nulled[`${table}.${f.col}`] ?? 0) + 1;
          } else {
            skip = true;
          }
        }
      }
      if (skip) {
        skipped[table] = (skipped[table] ?? 0) + 1;
        continue;
      }

      if (table === 'tblSecUser' && typeof row.Password === 'string' && row.Password) {
        row.Password = await argon2.hash(row.Password, { type: argon2.argon2id });
      }
      rows.push(row);
    }

    // Keep the pre-blanking copy so the deferred columns can be filled afterwards.
    const defer = deferredFor(table);
    if (defer.length) {
      sourceRows.set(table, rows.map((r) => ({ ...r })));
      for (const r of rows) for (const c of defer) r[c] = null;
    }

    if (!rows.length) {
      console.log(`  ${table.padEnd(34)} 0 rows`);
      continue;
    }

    const colNames = Object.keys(rows[0]);
    const quoted = colNames.map((c) => `"${c}"`).join(', ');
    // Chunked multi-row INSERT — the dataset is small (largest table is ~2.2k rows).
    for (let i = 0; i < rows.length; i += 250) {
      const chunk = rows.slice(i, i + 250);
      const values = chunk
        .map(
          (r) =>
            `(${colNames
              .map((c) => {
                const v = r[c];
                if (v === null || v === undefined) return 'NULL';
                if (v instanceof Date) return `'${v.toISOString()}'`;
                if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
                if (typeof v === 'number' || typeof v === 'bigint') return String(v);
                return `'${String(v).replace(/'/g, "''")}'`;
              })
              .join(', ')})`,
        )
        .join(', ');
      await prisma.$executeRawUnsafe(`INSERT INTO "${table}" (${quoted}) VALUES ${values}`);
    }
    console.log(`  ${table.padEnd(34)} ${rows.length} rows`);
  }

  // Second pass: now that every table is loaded, fill the columns we deferred to break
  // the FK cycle. Any value whose parent still does not exist stays NULL.
  for (const d of deferred) {
    const rows = sourceRows.get(d.child) ?? [];
    const pk = await prisma.$queryRawUnsafe<{ col: string }[]>(
      `SELECT a.attname AS col FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = '"${d.child}"'::regclass AND i.indisprimary`,
    );
    let filled = 0;
    for (const r of rows) {
      const v = r[d.col];
      if (v === null || v === undefined) continue;
      const where = pk.map((k) => `"${k.col}" = ${JSON.stringify(r[k.col])}`).join(' AND ');
      const n = await prisma.$executeRawUnsafe(
        `UPDATE "${d.child}" SET "${d.col}" = ${String(v)} WHERE ${where}
           AND EXISTS (SELECT 1 FROM "${d.parent}" p WHERE p."${d.pcol}" = ${String(v)})`,
      );
      filled += n;
    }
    console.log(`  deferred fill: ${d.child}.${d.col} -> ${filled} rows`);
  }

  // Identity sequences must be advanced past the copied ids.
  for (const table of ORDER) {
    const pk = await prisma.$queryRawUnsafe<{ col: string }[]>(
      `SELECT a.attname AS col FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = '"${table}"'::regclass AND i.indisprimary`,
    ).catch(() => []);
    for (const { col } of pk) {
      await prisma
        .$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', '${col}'),
             COALESCE((SELECT MAX("${col}") FROM "${table}"), 1), true)`,
        )
        .catch(() => undefined);
    }
  }

  // tblSecUser.SubscriberID is a NEW column: the legacy schema links a login to a candidate
  // NOWHERE, and the C# that knew the mapping was not recovered. It is left NULL here on
  // purpose. Guessing it — e.g. assuming UserID == SubscriberID, which is only true because
  // ids 1 and 1 collide — would hand one candidate another candidate's CV.
  const unlinked = await prisma.secUser.count({ where: { subscriberID: null } });
  const candidates = await prisma.secMapUserRoles.count({ where: { roleId: 1 } });
  if (candidates) {
    console.log(
      `\nUNRESOLVED: ${candidates} candidate login(s) have no SubscriberID link ` +
        `(${unlinked} users unlinked in total).\n` +
        `  The legacy DB records no mapping between tblSecUser and tblSubscriberRegistration.\n` +
        `  /candidates/me will 404 for them until the mapping is supplied.`,
    );
  }

  console.log('\nOrphaned FKs set to NULL (parent row does not exist):');
  const n = Object.entries(nulled);
  console.log(n.length ? n.map(([k, v]) => `  ${k}: ${v}`).join('\n') : '  none');
  console.log('\nRows SKIPPED (orphaned on a NOT NULL column):');
  const s = Object.entries(skipped);
  console.log(s.length ? s.map(([k, v]) => `  ${k}: ${v}`).join('\n') : '  none');

  await pool.close();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
