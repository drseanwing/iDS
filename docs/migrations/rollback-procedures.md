# Migration Rollback Procedures

This document covers how to roll back a Prisma migration in the OpenGRADE project. Always attempt the least-destructive option first.

---

## Important: Prisma Has No Automatic Rollback

Prisma Migrate does not generate `down` migrations. Rolling back requires one of:

1. **Reverting schema changes with a new migration** (preferred for non-destructive changes)
2. **Running manual SQL** to undo the change
3. **Restoring from backup** (last resort, causes data loss for the window since backup)

---

## Option 1: New Forward Migration (Preferred)

If the problematic migration added a column, table, or index — and no data was written to those objects — you can undo it with a new migration that drops them.

```bash
cd apps/api

# Edit schema.prisma to revert your changes, then:
npx prisma migrate dev --name revert_<original_migration_name>
```

Review the generated SQL before applying. This approach:
- Keeps migration history clean and linear
- Does not require manual `prisma migrate resolve` calls
- Works well for additive changes (new tables, new optional columns, new indexes)

---

## Option 2: Manual SQL Rollback

For cases where you need to undo changes without a full backup restore.

### Step 1: Connect to the Database

```bash
psql "$DATABASE_URL"
```

### Step 2: Apply Rollback SQL

#### Rolling Back `20260311000000_add_pdf_export_job`

```sql
-- Drop the index first (required before dropping table)
DROP INDEX IF EXISTS "PdfExportJob_guidelineId_createdAt_idx";

-- Drop the foreign key constraint
ALTER TABLE "PdfExportJob"
  DROP CONSTRAINT IF EXISTS "PdfExportJob_guidelineId_fkey";

-- Drop the table
DROP TABLE IF EXISTS "PdfExportJob";

-- Drop the enum type
DROP TYPE IF EXISTS "PdfJobStatus";
```

#### Rolling Back `20260306000000_init` (Full Schema — Emergency Only)

Dropping the full schema should only be done if restoring from backup afterward:

```sql
-- WARNING: This destroys all data. Only use before restoring from backup.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

#### Template for Rolling Back an Added Column

```sql
ALTER TABLE "<TableName>" DROP COLUMN IF EXISTS "<column_name>";
```

#### Template for Rolling Back an Added Index

```sql
DROP INDEX IF EXISTS "<IndexName>";
```

#### Template for Rolling Back an Added Table

```sql
DROP TABLE IF EXISTS "<TableName>";
```

#### Template for Rolling Back an Added Enum Value

PostgreSQL does not support removing enum values directly. Options:
1. Create a new enum without the value, cast the column, drop the old enum, rename.
2. Leave the enum value in place (harmless if unused) and revert the application code.

### Step 3: Mark the Migration as Rolled Back in Prisma

After manually reverting the SQL, tell Prisma the migration was rolled back so it does not try to re-apply it:

```bash
npx prisma migrate resolve --rolled-back <migration_name>

# Example:
npx prisma migrate resolve --rolled-back 20260311000000_add_pdf_export_job
```

Verify the status:

```bash
npx prisma migrate status
```

---

## Option 3: Restore from Backup (Emergency Rollback)

Use this when data corruption has occurred or when manual SQL rollback is not feasible.

**This procedure causes data loss for all writes made since the backup was taken.**

### Step 1: Identify the Backup to Restore

```bash
ls -lh /var/backups/opengrade-db/
```

Select the most recent backup taken **before** the migration was applied.

### Step 2: Stop the Application

Prevent new writes during restore. Scale down the API deployment or enable maintenance mode.

### Step 3: Restore the Backup

```bash
# Drop existing connections
psql "$DATABASE_URL" -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = current_database() AND pid <> pg_backend_pid();
"

# Restore from dump
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname "$DATABASE_URL" \
  /var/backups/opengrade-db/<backup_file>.dump
```

### Step 4: Verify the Restore

```bash
DATABASE_URL="$DATABASE_URL" bash infra/scripts/verify-migration.sh
```

Confirm row counts match pre-migration expectations.

### Step 5: Reset Prisma Migration State

After restoring from backup, the `_prisma_migrations` table is back to its pre-migration state. Verify Prisma agrees:

```bash
npx prisma migrate status
```

If Prisma shows the rolled-back migration as pending, do NOT re-apply it. Keep it in the `prisma/migrations/` directory so the history is preserved, but mark it rolled back if needed:

```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

### Step 6: Restart the Application

Restart the API and run the post-migration checklist (health check, smoke test).

---

## Using `prisma migrate resolve`

`prisma migrate resolve` is used to manually update the migration state in `_prisma_migrations` without running SQL. Use it when:

- You manually ran the rollback SQL and need to update Prisma's state
- A migration partially applied and left Prisma in an inconsistent state
- You are marking a baseline migration on a database that was seeded manually

```bash
# Mark a migration as having been applied (no SQL runs)
npx prisma migrate resolve --applied <migration_name>

# Mark a migration as rolled back
npx prisma migrate resolve --rolled-back <migration_name>
```

---

## Post-Rollback Checklist

After any rollback:

- [ ] Run `infra/scripts/verify-migration.sh` and confirm it passes
- [ ] Run `npx prisma migrate status` and confirm state is consistent
- [ ] Confirm the application starts and the health check returns 200
- [ ] Document what happened: migration name, reason for rollback, method used, data loss (if any)
- [ ] File a post-mortem or incident report if production data was affected
- [ ] Root-cause the issue in the migration before attempting to re-apply
