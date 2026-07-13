# Database — db_aajiveka (deliverable #10)

This folder is the reverse-engineered analysis of `db_aajiveka.bak`, the SQL Server backup
that powers the reference AajivikaPortal ATS.

## Contents

| File | What it is |
|------|-----------|
| `SCHEMA_REPORT.md` | Human-readable analysis: 61 tables grouped by domain, reconstructed columns, login flow, and the 79 recovered stored procedures. |
| `procs/*.sql` | The **actual stored-procedure definitions** recovered from the backup, grouped by domain (`spsubscriber`, `spclient`, `spsec`, `spqc`, …). These are real and runnable. The API calls these directly. |
| `schema.sql` | CREATE TABLE DDL for the tables whose columns were confidently reconstructed. Non-authoritative — see below. |

## Why the DDL is partial

A `.bak` stores table definitions in **binary system catalogs** that only SQL Server can read.
Stored-procedure *bodies*, however, are stored as text and were fully recovered (`db/procs/`).
Columns in `SCHEMA_REPORT.md`/`schema.sql` are inferred from how the procs read/write each table,
so they cover the columns the app actually uses — not necessarily every column or exact type.

## Getting the authoritative schema

Restore the backup on any SQL Server (2017+) instance, then script it out:

```sql
RESTORE DATABASE db_aajiveka
  FROM DISK = N'/path/db_aajiveka.bak'
  WITH MOVE 'db_aajiveka'     TO N'/var/opt/mssql/data/db_aajiveka.mdf',
       MOVE 'db_aajiveka_log' TO N'/var/opt/mssql/data/db_aajiveka_log.ldf';
```

Then generate full DDL (SSMS: *Tasks → Generate Scripts*, or `mssql-scripter`):

```bash
mssql-scripter -S localhost -d db_aajiveka -U sa \
  --schema-and-data --file-per-object -f ./generated
```

The API in `apps/api` connects to this restored database via the connection string in
`apps/api/.env` and invokes the procs in `procs/` — no ORM, mirroring the original Dapper layer.
