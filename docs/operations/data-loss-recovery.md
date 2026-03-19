# Data Loss Recovery

This runbook covers recovery procedures when data has been lost, corrupted, or accidentally deleted in OpenGRADE production.

## Assessing the Scope

Before starting recovery, determine:

1. **What data is affected?** (guidelines, sections, recommendations, user accounts, all data)
2. **When did the loss occur?** (identifies which backup to restore from)
3. **What is the cause?** (accidental deletion, bug, hardware failure, attack — affects the recovery path)
4. **Is the loss ongoing?** (if a bug is still running, stop it before restoring)

Check the activity log table for the last known-good operations:

```sql
SELECT entity_type, entity_id, action, created_at, user_id
FROM activity_logs
ORDER BY created_at DESC
LIMIT 100;
```

---

## Recovery Path 1: Version Snapshots (preferred for content data)

OpenGRADE maintains version snapshots for guidelines, sections, and recommendations. This is the fastest recovery path for content-level data loss.

### List available versions

```typescript
// Via API
GET /api/versions?guidelineId=<id>&limit=20
```

```sql
-- Direct database query
SELECT id, guideline_id, created_at, created_by, snapshot
FROM versions
WHERE guideline_id = '<guideline-id>'
ORDER BY created_at DESC
LIMIT 20;
```

### Restore from a version snapshot

```typescript
// Via API - creates a new version restoring the snapshot content
POST /api/versions/<version-id>/restore
Authorization: Bearer <admin-token>
```

```sql
-- Direct restore: extract the snapshot JSON and update the relevant records
-- Always do this in a transaction
BEGIN;

-- Example: restore a guideline's sections from a snapshot
SELECT snapshot FROM versions WHERE id = '<version-id>';

-- Apply the snapshot data to the target records
-- (specific SQL depends on the snapshot schema)

COMMIT;
```

### Verification after version restore

```sql
-- Confirm the restored data looks correct
SELECT g.id, g.title, g.updated_at,
       COUNT(s.id) AS section_count,
       COUNT(r.id) AS recommendation_count
FROM guidelines g
LEFT JOIN sections s ON s.guideline_id = g.id
LEFT JOIN recommendations r ON r.section_id = s.id
WHERE g.id = '<guideline-id>'
GROUP BY g.id;
```

---

## Recovery Path 2: S3 Backup Restoration

Full database backups are stored in S3. Use this when version snapshots are insufficient or when the loss affects data not covered by snapshots.

### List available backups

```bash
aws s3 ls s3://ids-backups/database/ --recursive | sort | tail -20
```

### Download a backup

```bash
BACKUP_KEY="database/ids-prod-backup-20260315-0200.sql.gz"
aws s3 cp s3://ids-backups/${BACKUP_KEY} /tmp/restore-$(date +%Y%m%d).sql.gz

# Decompress
gunzip /tmp/restore-$(date +%Y%m%d).sql.gz
```

### Restore to a staging database first

ALWAYS validate the backup on a staging instance before touching production.

```bash
# Restore to staging
PGPASSWORD=$STAGING_DB_PASSWORD psql \
  -h staging-db.ids.internal \
  -U ids_user \
  -d ids_staging \
  < /tmp/restore-$(date +%Y%m%d).sql

# Validate row counts match expectations
PGPASSWORD=$STAGING_DB_PASSWORD psql \
  -h staging-db.ids.internal \
  -U ids_user \
  -d ids_staging \
  -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"
```

### Surgical restore (selective tables)

If only specific tables are affected, restore just those tables to avoid overwriting unaffected data:

```bash
# Extract specific tables from the backup
pg_restore --table=guidelines --table=sections --table=recommendations \
  -f /tmp/selected-tables.sql \
  /tmp/restore-$(date +%Y%m%d).sql

# Apply to production in a maintenance window
PGPASSWORD=$PROD_DB_PASSWORD psql \
  -h prod-db.ids.internal \
  -U ids_user \
  -d ids_prod \
  < /tmp/selected-tables.sql
```

---

## Recovery Path 3: RDS Point-in-Time Recovery (PITR)

RDS automated backups support point-in-time recovery to any second within the retention window (default: 7 days). Use this for large-scale data loss where a specific timestamp can be identified.

### Identify the recovery timestamp

Determine the last known-good time — use application logs, activity logs, or monitoring alerts to pinpoint when the data was still intact.

```bash
# Check CloudWatch logs for the last successful write before the incident
aws logs filter-log-events \
  --log-group-name /ids/api/prod \
  --start-time $(date -d "2 hours ago" +%s000) \
  --filter-pattern "POST /api/guidelines"
```

### Initiate PITR

PITR creates a NEW RDS instance — it does not modify the existing one.

```bash
RECOVERY_TIME="2026-03-20T10:00:00Z"  # Adjust to actual recovery point

aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier ids-prod-postgres \
  --target-db-instance-identifier ids-pitr-recovery-$(date +%Y%m%d) \
  --restore-time ${RECOVERY_TIME} \
  --db-instance-class db.t3.medium \
  --no-multi-az
```

### Wait for the restored instance to be available

```bash
aws rds wait db-instance-available \
  --db-instance-identifier ids-pitr-recovery-$(date +%Y%m%d)

# Get the endpoint
aws rds describe-db-instances \
  --db-instance-identifier ids-pitr-recovery-$(date +%Y%m%d) \
  --query 'DBInstances[0].Endpoint.Address'
```

### Migrate data from the recovered instance

```bash
# Dump from the recovered instance
PGPASSWORD=$PROD_DB_PASSWORD pg_dump \
  -h <recovered-instance-endpoint> \
  -U ids_user \
  ids_prod \
  > /tmp/pitr-dump-$(date +%Y%m%d).sql

# Selectively restore to production (or promote the recovered instance as the new primary)
```

### Promote the recovered instance (if full cutover is required)

1. Scale down the API deployment to stop writes
2. Update the `DATABASE_URL` secret in AWS Secrets Manager to point to the recovered instance endpoint
3. Redeploy the API
4. Verify connectivity and data integrity
5. Delete the old instance after confirming recovery

```bash
kubectl scale deployment ids-api --replicas=0 -n ids-prod

aws secretsmanager put-secret-value \
  --secret-id ids-prod/database-url \
  --secret-string "postgresql://ids_user:<password>@<recovered-endpoint>:5432/ids_prod"

kubectl scale deployment ids-api --replicas=3 -n ids-prod
```

---

## Verification After Recovery

Run these checks after any recovery operation:

### Row count sanity check

```sql
SELECT
  (SELECT COUNT(*) FROM guidelines)       AS guidelines,
  (SELECT COUNT(*) FROM sections)         AS sections,
  (SELECT COUNT(*) FROM recommendations)  AS recommendations,
  (SELECT COUNT(*) FROM references)       AS references,
  (SELECT COUNT(*) FROM versions)         AS versions,
  (SELECT COUNT(*) FROM users)            AS users;
```

### Referential integrity check

```sql
-- Orphaned sections (no parent guideline)
SELECT COUNT(*) FROM sections s
LEFT JOIN guidelines g ON g.id = s.guideline_id
WHERE g.id IS NULL;

-- Orphaned recommendations
SELECT COUNT(*) FROM recommendations r
LEFT JOIN sections s ON s.id = r.section_id
WHERE s.id IS NULL;
```

### API smoke test

```bash
BASE_URL="https://api.opengrade.app"
TOKEN="<admin-token>"

# Health
curl -sf ${BASE_URL}/health | jq .

# List guidelines
curl -sf -H "Authorization: Bearer ${TOKEN}" \
  ${BASE_URL}/api/guidelines | jq '.total'

# Confirm a specific known guideline is intact
curl -sf -H "Authorization: Bearer ${TOKEN}" \
  ${BASE_URL}/api/guidelines/<known-id> | jq '{id, title, updatedAt}'
```

### Post-recovery monitoring

After recovery, watch for 2 hours:
- Error rate in CloudWatch (target: < 1%)
- Slow query log for unexpected full-table scans
- Application logs for unexpected 500 errors or missing-data warnings

---

## Communication During Recovery

- Update the incident channel every 15 minutes with status
- Once recovery is confirmed, post a summary: what was lost, how much was recovered, recovery point used
- Schedule a post-mortem within 5 business days
