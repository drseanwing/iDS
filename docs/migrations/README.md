# Database Migration Guide

This guide covers the full lifecycle of Prisma migrations in the OpenGRADE project: creation, testing, applying to production, and rolling back.

## Overview

OpenGRADE uses [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate) to manage PostgreSQL schema changes. Migrations are SQL files generated from the Prisma schema and versioned in source control under `apps/api/prisma/migrations/`.

```
apps/api/prisma/
├── schema.prisma          # Source of truth for the data model
└── migrations/
    ├── migration_lock.toml
    ├── 20260306000000_init/
    │   └── migration.sql
    └── 20260311000000_add_pdf_export_job/
        └── migration.sql
```

## Workflow

### 1. Edit the Schema

Modify `apps/api/prisma/schema.prisma` with your changes. Keep changes focused — one logical concern per migration.

### 2. Create a New Migration (Development)

```bash
cd apps/api
npx prisma migrate dev --name <descriptive_name>
```

This will:
- Generate a new timestamped directory under `prisma/migrations/`
- Apply the migration to your local development database
- Regenerate the Prisma client

Naming convention: `snake_case`, describes the change. Examples:
- `add_coi_status_column`
- `create_activity_log_table`
- `rename_section_ordering`

### 3. Review the Generated SQL

Always inspect the generated `migration.sql` before committing:

```bash
cat apps/api/prisma/migrations/<timestamp>_<name>/migration.sql
```

Check for:
- Destructive operations (`DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN` type changes)
- Missing indexes on new foreign keys
- Correct default values
- Data migrations that may be needed alongside schema changes

### 4. Test the Migration

Before merging, verify the migration applies cleanly:

```bash
# Check current migration status
npx prisma migrate status

# Run the verification script against a test/staging DB
DATABASE_URL="postgresql://..." bash infra/scripts/verify-migration.sh
```

See `docs/migrations/verification-checklist.md` for the full checklist.

### 5. Apply to Production

Production migrations are applied via CI/CD (see `docs/deployment/`). The deploy pipeline runs:

```bash
npx prisma migrate deploy
```

`migrate deploy` (unlike `migrate dev`) does not generate new migrations — it only applies pending ones. It is safe for automated pipelines.

### 6. Verify Post-Migration

After deployment, run the verification script:

```bash
DATABASE_URL="$PROD_DATABASE_URL" bash infra/scripts/verify-migration.sh
```

Then work through `docs/migrations/verification-checklist.md` — post-migration section.

## Key Commands Reference

| Command | Purpose |
|---|---|
| `prisma migrate dev --name <name>` | Create + apply migration (dev only) |
| `prisma migrate deploy` | Apply pending migrations (CI/prod) |
| `prisma migrate status` | Show applied vs pending migrations |
| `prisma migrate resolve --applied <migration>` | Mark a migration as applied without running it |
| `prisma migrate resolve --rolled-back <migration>` | Mark a migration as rolled back |
| `prisma db pull` | Introspect DB and update schema (escape hatch) |
| `prisma generate` | Regenerate client after schema changes |

## Destructive Changes

Prisma does not automatically handle destructive schema changes. For operations such as:

- Renaming a column (generates DROP + ADD, losing data)
- Changing a column type
- Adding a NOT NULL column to a populated table

You must write the migration SQL manually or use a multi-step migration strategy:

1. Add the new column (nullable)
2. Backfill data
3. Add NOT NULL constraint
4. Remove old column (in a separate, later migration)

## Baseline Migrations

The `20260306000000_init` migration is the baseline — it captures the full initial schema. It was created by running `prisma migrate dev` against an empty database with the fully-defined schema.

## Related Documents

- `docs/migrations/verification-checklist.md` — Pre/post migration checklists
- `docs/migrations/rollback-procedures.md` — Rollback SQL and procedures
- `infra/scripts/verify-migration.sh` — Automated verification script
- `infra/scripts/pre-migration-backup.sh` — Database backup script
