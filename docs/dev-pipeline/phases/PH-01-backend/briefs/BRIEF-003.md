# BRIEF-003 — 2026-09-26

**Phase:** `PH-01`
**Source:** user

## Raw input
"The database must be postgresql"

## Extracted claims
| Local | Class | Summary | Matches | Action |
|-------|-------|---------|---------|--------|
| 1 | refinement (contradicts existing) | DB = PostgreSQL, not SQL Server | contradicts backend-rup.md:3,57; ARCHITECTURE.md:6; CONTEXT.md:24; SESSION-CACHE:6 | absorb → CLM-016; update docs |

## Contradictions resolved
- `docs/backend-rup.md` line 3 header: "SQL Server" → "PostgreSQL"
- `docs/backend-rup.md` line 57: "Data Model (SQL Server)" → "Data Model (PostgreSQL)"
- `docs/ARCHITECTURE.md` line 6: "SQL Server" → "PostgreSQL"
- `docs/dev-pipeline/phases/PH-01-backend/CONTEXT.md` invariant: "SQL Server metadata only" → "PostgreSQL metadata only"
- `docs/dev-pipeline/SESSION-CACHE.md` carry-over: "SQL Server" → "PostgreSQL"
- `src/data-source.ts`: type 'mssql' → 'postgres'; port 1433 → 5432; username 'sa' → 'postgres'; removed mssql options
- `src/app.module.ts`: type 'mssql' → 'postgres'; port 1433 → 5432; username 'sa' → 'postgres'; removed mssql options
- `docker-compose.yml`: mssql image → postgres:16-alpine; env/ports/healthcheck updated
- `.env.example`: port 1433 → 5432; username sa → postgres; password → postgres
- `package.json`: `mssql` dep → `pg@^8.13.0`

## Implementation notes (not yet done — next task)
- `src/migrations/*.ts` (12 files): all SQL Server DDL (`UNIQUEIDENTIFIER`, `NVARCHAR`, `DATETIME2`, `GETUTCDATE()`, bracket quotes) must be regenerated for PostgreSQL. Run `npm run migration:generate` after fixing entities.
- `mssql` npm package removed from `node_modules` — re-run `npm install`.
- Existing `done` TASK rows are unaffected; their implementations referenced the old stack.

No backlog/story changes. IDs untouched.
