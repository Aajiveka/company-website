/**
 * Renders prisma/data/india-education.ts and prisma/data/india-institutes.ts into the SQL body
 * of an education-masters migration.
 *
 *   npx tsx prisma/tools/build-education-sql.ts > /tmp/rows.sql
 *
 * Why this exists: docker-entrypoint.sh runs `prisma migrate deploy` and nothing else, so a
 * migration is the only thing that reaches production. `prisma/seed.ts` is for fresh dev and CI
 * databases and is never run against prod. Reference data the feature cannot work without has
 * to travel in a migration — but hand-maintaining ~1,600 INSERTs next to the TypeScript that
 * describes the same rows guarantees the two drift apart, so the SQL is generated from the
 * TypeScript instead.
 *
 * Everything emitted is idempotent (ON CONFLICT DO NOTHING against a natural key) and resolves
 * foreign keys by name rather than by hard-coded id, so it is safe on a database that already
 * has some of the rows, and safe to re-run.
 *
 * To add qualifications, courses or institutions later: edit the data modules, re-run this, and
 * paste the delta into a NEW migration. Never edit a migration that has already been applied —
 * `migrate deploy` skips it and the change silently never lands.
 */
import { QUALIFICATIONS } from '../data/india-education';
import { INSTITUTES_BY_STATE, instituteSearchKey, instituteSearchText } from '../data/india-institutes';

const q = (v: string | number | null) =>
  v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${v.replace(/'/g, "''")}'`;

const out: string[] = [];

/* ---- qualifications ---------------------------------------------------- */

out.push('-- Qualifications (tblMstrEducationType). Conflict target is the name, so a row that');
out.push('-- already exists keeps its id and every tblSubscriberEducation row pointing at it.');
out.push('INSERT INTO "tblMstrEducationType" ("EducationTypeID", "Descr", "HighestSeq", "Category") VALUES');
out.push(
  QUALIFICATIONS.map((x) => `  (${x.id}, ${q(x.label)}, ${x.seq}, ${q(x.category)})`).join(',\n') +
    '\nON CONFLICT ("Descr") DO UPDATE SET "Category" = EXCLUDED."Category", "HighestSeq" = EXCLUDED."HighestSeq";',
);
out.push('');
out.push('-- Keep the identity sequence ahead of the explicit ids above.');
out.push(
  `SELECT setval(pg_get_serial_sequence('"tblMstrEducationType"', 'EducationTypeID'),\n` +
    `  GREATEST((SELECT MAX("EducationTypeID") FROM "tblMstrEducationType"), 1), true);`,
);
out.push('');

/* ---- courses ------------------------------------------------------------ */

out.push('-- Courses (tblMstrCourse): the branch/stream inside a qualification. EducationTypeID is');
out.push('-- looked up by name rather than assumed, so this cannot land a course under the wrong');
out.push('-- qualification if an environment numbered its rows differently. ShortForm is NOT NULL');
out.push('-- in the legacy schema and branches have no agreed acronym, so it is stored empty.');
for (const qual of QUALIFICATIONS) {
  const values = qual.courses.map((c) => `    (${q(c)})`).join(',\n');
  out.push(`INSERT INTO "tblMstrCourse" ("DegreeName", "ShortForm", "EducationTypeID")`);
  out.push(`SELECT v.name, '', t."EducationTypeID"`);
  out.push(`FROM (VALUES\n${values}\n  ) AS v(name)`);
  out.push(`CROSS JOIN "tblMstrEducationType" t`);
  out.push(`WHERE t."Descr" = ${q(qual.label)}`);
  out.push(`ON CONFLICT ("EducationTypeID", "DegreeName") DO NOTHING;`);
  out.push('');
}

/* ---- institutions ------------------------------------------------------- */

out.push('-- Institutions (tblMstrInstitute). StateID is resolved from the state name; CityID is');
out.push('-- resolved only when a district in that state carries the same name, because');
out.push('-- tblMstrCily is a district list and many campuses sit in a city named differently');
out.push('-- from its district (Bhubaneswar/Khordha, Roorkee/Haridwar). The City text always');
out.push('-- holds the place a candidate would recognise.');
for (const [state, rows] of Object.entries(INSTITUTES_BY_STATE)) {
  const values = rows
    .map(
      (i) =>
        `    (${q(i.name)}, ${q(instituteSearchKey(i.name))}, ${q(instituteSearchText(i.name))}, ${q(i.kind)}, ${q(i.city)})`,
    )
    .join(',\n');
  out.push(
    `INSERT INTO "tblMstrInstitute" ("Name", "SearchKey", "SearchText", "Kind", "StateID", "City", "CityID")`,
  );
  out.push(`SELECT v.name, v.search_key, v.search_text, v.kind, s."StateID", v.city,`);
  out.push(
    `  (SELECT c."CityID" FROM "tblMstrCily" c\n` +
      `    WHERE c."StateID" = s."StateID" AND lower(c."Descr") = lower(v.city) LIMIT 1)`,
  );
  out.push(`FROM (VALUES\n${values}\n  ) AS v(name, search_key, search_text, kind, city)`);
  out.push(`CROSS JOIN "tblMstrState" s`);
  out.push(`WHERE s."Descr" = ${q(state)}`);
  out.push(`ON CONFLICT ("SearchKey") DO NOTHING;`);
  out.push('');
}

process.stdout.write(out.join('\n') + '\n');
