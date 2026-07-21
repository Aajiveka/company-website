# Database — db_aajiveka (AajivikaPortal ATS)

Everything here is **extracted from a real restore** of `db_aajiveka.bak` on SQL Server 2022 —
not inferred. See `SCHEMA_REPORT.md` for the inventory and the findings that shape the rebuild.

## Contents

| File | What it is |
|------|-----------|
| `SCHEMA_REPORT.md` | Authoritative inventory: 73 tables, 97 procs, PKs, row counts, and the two findings that drive the rebuild. |
| `schema.sql` | 73 `CREATE TABLE` — real types, nullability, `IDENTITY`, defaults, primary keys. |
| `indexes.sql` | 18 non-primary-key indexes. |
| `types.sql` | The 10 `udt_*` table-valued types. **Every write proc takes one as a parameter** — without these the write path cannot be called at all. |
| `procs/` | 99 modules (97 stored procedures + 2 functions), one clean file each. |
| `seed/` | 19 master/lookup tables (pipe-separated). This is the app's real reference data — roles, functions, cities, designations, statuses. |
| `procs_damaged_strings_extraction/` | The previous `strings`-scraped extraction. **Do not use.** 24 of its procs had bytes deleted mid-statement, precisely on `FROM`/`JOIN`/`ON` text. Kept only for diffing. |

## Restoring the backup

The machine is arm64, so SQL Server runs under amd64 emulation.

```bash
docker run -d --name aajiveka-mssql --platform linux/amd64 \
  -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='<password>' -e MSSQL_PID=Developer \
  -p 11433:1433 mcr.microsoft.com/mssql/server:2022-latest

docker exec aajiveka-mssql mkdir -p /var/opt/mssql/backup
docker cp db_aajiveka.bak aajiveka-mssql:/var/opt/mssql/backup/
```

The backup's logical file names are `db_aajivika_dev` / `db_aajivika_dev_log` (note the spelling
differs from the database name):

```sql
RESTORE DATABASE db_aajiveka
  FROM DISK = N'/var/opt/mssql/backup/db_aajiveka.bak'
  WITH MOVE 'db_aajivika_dev'     TO N'/var/opt/mssql/data/db_aajiveka.mdf',
       MOVE 'db_aajivika_dev_log' TO N'/var/opt/mssql/data/db_aajiveka_log.ldf',
       REPLACE, RECOVERY;
```

Scripting the catalogs out requires `SET QUOTED_IDENTIFIER ON` (the `FOR XML PATH` aggregation
fails without it), and `sqlcmd -y 0` to stop long proc bodies being truncated.

## Reading this schema before you model it

The legacy database declares **no foreign keys and no primary key on half its tables**. Do not
mirror that. The relational model for PostgreSQL has to be *derived* from how the procs join —
`procs/` is the specification, `schema.sql` is only the column truth.
