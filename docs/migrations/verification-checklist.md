# Migration Verification Checklist

Use this checklist for every migration applied to staging or production. Complete all items — do not skip steps marked **REQUIRED**.

---

## Pre-Migration Checklist

### 1. Preparation (Complete Before Any Work)

- [ ] **REQUIRED** Confirm the target environment (staging vs production)
- [ ] **REQUIRED** Notify the team via the appropriate channel before starting
- [ ] **REQUIRED** Record the start time and who is performing the migration
- [ ] Confirm a maintenance window is in place if the migration is expected to lock tables

### 2. Backup (REQUIRED)

- [ ] **REQUIRED** Run `infra/scripts/pre-migration-backup.sh` and confirm it exits 0
- [ ] **REQUIRED** Verify the backup file exists and is non-empty:
  ```bash
  ls -lh /var/backups/opengrade-db/
  ```
- [ ] Record the backup filename in the migration log

### 3. Review the Migration SQL

- [ ] Read the migration SQL file in full:
  ```bash
  cat apps/api/prisma/migrations/<timestamp>_<name>/migration.sql
  ```
- [ ] Confirm there are no unintended `DROP` statements
- [ ] Confirm `ALTER COLUMN` type changes are safe for existing data
- [ ] Confirm new NOT NULL columns have a DEFAULT or will be backfilled
- [ ] Confirm new foreign keys have indexes
- [ ] Confirm ENUM changes do not remove values still in use

### 4. Dry Run / Staging Validation

- [ ] Apply the migration to a staging environment first:
  ```bash
  DATABASE_URL="$STAGING_DATABASE_URL" npx prisma migrate deploy
  ```
- [ ] Run the verification script on staging:
  ```bash
  DATABASE_URL="$STAGING_DATABASE_URL" bash infra/scripts/verify-migration.sh
  ```
- [ ] Smoke test key application flows on staging (login, guideline load, PDF export)
- [ ] Confirm no application errors in staging logs after migration

### 5. Migration Status Check

- [ ] Run `npx prisma migrate status` and confirm only the expected migration is pending
- [ ] Confirm the `_prisma_migrations` table matches expectations:
  ```sql
  SELECT migration_name, finished_at, applied_steps_count
  FROM _prisma_migrations
  ORDER BY started_at DESC
  LIMIT 5;
  ```

---

## Post-Migration Checklist

### 1. Schema Consistency

- [ ] Run `npx prisma migrate status` — output must show "Database schema is up to date"
- [ ] Run the verification script:
  ```bash
  DATABASE_URL="$PROD_DATABASE_URL" bash infra/scripts/verify-migration.sh
  ```
- [ ] Confirm all expected tables exist (script checks this automatically)
- [ ] Confirm all expected indexes are present (script checks this automatically)

### 2. Data Integrity

- [ ] Verify row counts for critical tables are plausible (script reports these):
  - `Organization`
  - `User`
  - `Guideline`
  - `Recommendation`
  - `PdfExportJob`
- [ ] If the migration moved or transformed data, spot-check affected rows:
  ```sql
  -- Example: verify a backfill
  SELECT COUNT(*) FROM "Guideline" WHERE new_column IS NULL;
  -- Should be 0 after a backfill migration
  ```
- [ ] Verify foreign key constraints are intact (no orphaned rows):
  ```sql
  SELECT COUNT(*) FROM "OrganizationMember" om
  LEFT JOIN "Organization" o ON o.id = om."organizationId"
  WHERE o.id IS NULL;
  -- Should be 0
  ```

### 3. Application Health

- [ ] Confirm the application started successfully after deployment
- [ ] Check application logs for database errors in the first 5 minutes after migration
- [ ] Verify health check endpoint returns 200:
  ```bash
  curl -f https://<host>/health
  ```
- [ ] Run a smoke test: log in, load a guideline, trigger a PDF export
- [ ] Confirm response times are within normal range (no query plan regressions)

### 4. Completion

- [ ] Record completion time and outcome in the migration log
- [ ] If any issues were found, document them and whether rollback was triggered
- [ ] Notify the team that migration is complete

---

## Rollback Decision Criteria

Initiate rollback if ANY of the following are true:

| Condition | Action |
|---|---|
| Application fails to start after migration | Immediate rollback |
| Health check returns non-200 for > 2 minutes | Immediate rollback |
| Data corruption detected (unexpected NULLs, missing rows) | Immediate rollback |
| Error rate increases > 5% above baseline | Investigate, rollback if unresolved in 10 min |
| P95 response time doubles vs pre-migration baseline | Investigate, rollback if unresolved in 10 min |
| `prisma migrate status` shows failed migration | See rollback procedures |

See `docs/migrations/rollback-procedures.md` for rollback steps.
