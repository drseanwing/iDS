# Disaster Recovery Guide

This guide covers recovery procedures for catastrophic failures where data or services must be restored from backups.

## Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

| Service | RTO | RPO | Criticality |
|---------|-----|-----|-------------|
| PostgreSQL Database | 15 minutes | 1 hour | Critical |
| Keycloak (Identity) | 30 minutes | 1 day | Critical |
| MinIO/S3 Object Storage | 1 hour | 24 hours | High |
| API Server | 5 minutes | N/A (stateless) | High |
| Web Frontend | 5 minutes | N/A (stateless) | High |

**Assumptions:**
- RTO assumes all data is available and backups are accessible
- RPO assumes daily backup schedule is in place
- Actual recovery may take longer if backups are corrupted or inaccessible

---

## Backup Strategy

### PostgreSQL Database

**Backup Method:** `pg_dump` full database dump (all schemas)

**Backup Schedule:**
- Daily full backups at 02:00 UTC
- Backups stored in S3-compatible storage (separate from production MinIO)
- Retention: 30 days

**Backup Command:**
```bash
pg_dump -h postgres -U opengrade -d opengrade \
  --format=custom \
  --verbose \
  > /backups/opengrade-$(date +%Y%m%d).dump

# Upload to S3
aws s3 cp /backups/opengrade-*.dump s3://opengrade-backups/
```

**Point-in-Time Recovery (PITR):**
- WAL (Write-Ahead Logs) are archived to S3 daily
- Enables recovery to any point within the last 7 days
- Requires WAL files to be properly archived before recovery

### Keycloak

**Backup Method:** Realm export (JSON)

**Backup Schedule:**
- Daily full realm export at 03:00 UTC
- Stored alongside database backups
- Retention: 30 days

**Export Command:**
```bash
# Via Keycloak Admin CLI (requires direct access to container)
docker exec opengrade-keycloak /opt/keycloak/bin/kc.sh export \
  --realm opengrade \
  --file /tmp/keycloak-realm-export.json

# Copy and upload to S3
docker cp opengrade-keycloak:/tmp/keycloak-realm-export.json /backups/
aws s3 cp /backups/keycloak-realm-export.json s3://opengrade-backups/
```

### MinIO/S3 Object Storage

**Backup Method:** S3 sync to secondary S3 bucket or different storage system

**Backup Schedule:**
- Incremental sync every 6 hours
- Full sync once daily at 04:00 UTC
- Retention: 90 days in backup bucket

**Sync Command:**
```bash
# Local MinIO to backup bucket
aws s3 sync s3://opengrade \
  s3://opengrade-backups-files/ \
  --source-region us-east-1 \
  --region us-east-1

# Or using mc (MinIO Client):
mc mirror local/opengrade backup-bucket/opengrade
```

### Configuration & Secrets

**Items to Backup:**
- `.env` files (API, web, infrastructure)
- Keycloak client secrets
- S3 credentials
- Database credentials
- SSL/TLS certificates

**Storage:** Separate encrypted vault (HashiCorp Vault, AWS Secrets Manager)

---

## Recovery Procedures

### Scenario 1: Database Corruption or Loss

**Symptoms:**
- Database queries return corrupted data
- Database is completely inaccessible
- Data integrity checks fail (constraint violations, missing records)

**Recovery Steps:**

**Step 1: Assess Damage (5 minutes)**
```bash
# Connect to database
psql -h postgres -U opengrade -d opengrade

# Check for obvious issues
SELECT COUNT(*) FROM guidelines;
SELECT COUNT(*) FROM recommendations;

# Look for error messages in logs
docker logs opengrade-postgres | tail -100
```

**Step 2: Stop All Applications (2 minutes)**
```bash
# Stop API to prevent further writes
docker stop opengrade-api

# Stop any scheduled jobs that might write to DB
# (adjust based on actual scheduled jobs)
```

**Step 3: Restore from Backup (10 minutes)**

**Option A: Restore Latest Full Backup**
```bash
# Download latest backup from S3
aws s3 cp s3://opengrade-backups/opengrade-$(date +%Y%m%d).dump /tmp/

# Stop the database
docker stop opengrade-postgres

# Remove old database volume (WARNING: Data loss!)
docker volume rm opengrade_postgres_data

# Start fresh database container
docker compose -f infra/docker-compose.yml up -d postgres

# Wait for database to initialize (10 seconds)
sleep 10

# Restore from backup
pg_restore -h postgres -U opengrade -d opengrade \
  --format=custom \
  --verbose \
  /tmp/opengrade-$(date +%Y%m%d).dump

# Verify restoration
psql -h postgres -U opengrade -d opengrade -c "SELECT COUNT(*) FROM guidelines;"
```

**Option B: Point-in-Time Recovery (PITR)**

*Requires WAL files to be properly archived*

```bash
# Stop database
docker stop opengrade-postgres

# Remove corrupted data directory
docker volume rm opengrade_postgres_data

# Start fresh database with recovery mode
# (Requires manual PostgreSQL configuration - advanced topic)
# See: https://www.postgresql.org/docs/current/runtime-config-wal.html

# Alternatively, restore last known good backup then apply WAL files manually
pg_restore ... # (as above)

# Verify data integrity
psql -h postgres -U opengrade -d opengrade -c "SELECT * FROM guidelines LIMIT 1;"
```

**Step 4: Verify Integrity (5 minutes)**
```bash
# Run all data integrity checks
psql -h postgres -U opengrade -d opengrade << 'EOF'
-- Check for orphaned records
SELECT 'Orphaned recommendations' WHERE EXISTS
  (SELECT 1 FROM recommendations r
   WHERE NOT EXISTS (SELECT 1 FROM guidelines g WHERE g.id = r.guideline_id));

-- Count key entities
SELECT 'Guidelines' as entity, COUNT(*) as count FROM guidelines
UNION ALL
SELECT 'Recommendations', COUNT(*) FROM recommendations
UNION ALL
SELECT 'PICs', COUNT(*) FROM picos
UNION ALL
SELECT 'Evidence', COUNT(*) FROM evidence;

-- Check for recent changes
SELECT * FROM guidelines ORDER BY updated_at DESC LIMIT 5;
EOF
```

**Step 5: Restore API and Verify (5 minutes)**
```bash
# Start API server
docker start opengrade-api

# Wait for startup
sleep 5

# Check API health
curl http://localhost:3000/api/health/ready

# Test basic functionality
curl http://localhost:3000/api/guidelines
```

### Scenario 2: Keycloak Realm Corruption or Loss

**Symptoms:**
- Users cannot authenticate
- Keycloak admin console returns errors
- Realm configuration is missing or corrupted

**Recovery Steps:**

**Step 1: Assess State (2 minutes)**
```bash
# Check Keycloak logs
docker logs opengrade-keycloak | tail -50

# Try accessing admin console (might fail)
curl http://localhost:8080/auth/admin/
```

**Step 2: Backup Current State (1 minute)**
```bash
# Export current realm state (even if corrupted)
docker exec opengrade-keycloak /opt/keycloak/bin/kc.sh export \
  --realm opengrade \
  --file /tmp/keycloak-current-state.json

docker cp opengrade-keycloak:/tmp/keycloak-current-state.json /backups/
```

**Step 3: Stop Keycloak (1 minute)**
```bash
docker stop opengrade-keycloak
```

**Step 4: Restore from Backup (5 minutes)**
```bash
# Download last known good realm export from S3
aws s3 cp s3://opengrade-backups/keycloak-realm-export.json /tmp/

# Start Keycloak container fresh (without importing yet)
docker compose -f infra/docker-compose.yml up -d keycloak

# Wait for Keycloak to initialize (15-30 seconds)
sleep 20

# Copy realm export into container
docker cp /tmp/keycloak-realm-export.json opengrade-keycloak:/tmp/

# Delete corrupted realm
docker exec opengrade-keycloak /opt/keycloak/bin/kc.sh delete \
  --realm opengrade \
  || true  # OK if realm doesn't exist

# Import from backup
docker exec opengrade-keycloak /opt/keycloak/bin/kc.sh import \
  --realm opengrade \
  --file /tmp/keycloak-realm-export.json
```

**Step 5: Verify Authentication (5 minutes)**
```bash
# Check Keycloak health
curl http://localhost:8080/auth/

# Verify realm exists
curl http://localhost:8080/auth/realms/opengrade

# Get a test token (using a known test user)
curl -X POST http://localhost:8080/auth/realms/opengrade/protocol/openid-connect/token \
  -d "client_id=opengrade-api" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"

# API should accept token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/guidelines
```

### Scenario 3: Object Storage (MinIO/S3) Data Loss

**Symptoms:**
- PDF exports are missing
- Attachment downloads fail with 404
- MinIO bucket is empty or corrupted

**Recovery Steps:**

**Step 1: Assess Damage (5 minutes)**
```bash
# List current bucket contents
mc ls local/opengrade

# Check MinIO logs
docker logs opengrade-minio | tail -50

# Estimate data loss (compare to backup bucket)
mc ls backup-bucket/opengrade
```

**Step 2: Stop New Uploads (1 minute)**
```bash
# Gracefully shut down API to prevent new uploads during recovery
docker stop opengrade-api
```

**Step 3: Restore from Backup Bucket (varies by size)**

**Option A: Sync from Backup Bucket** (Recommended for incremental loss)
```bash
# Sync backup bucket to production bucket
mc mirror backup-bucket/opengrade local/opengrade --overwrite

# Or using AWS CLI:
aws s3 sync s3://opengrade-backups-files/opengrade s3://opengrade
```

**Option B: Recreate from Scratch** (If bucket is completely lost)
```bash
# Create new bucket
mc mb local/opengrade

# Restore from backup
mc mirror backup-bucket/opengrade local/opengrade
```

**Step 4: Verify Restoration (5 minutes)**
```bash
# Check restored object count
mc ls -r local/opengrade | wc -l

# Spot-check a few objects
mc cat local/opengrade/pdf-exports/guideline-123.pdf | head -c 100

# Verify bucket is accessible
curl http://localhost:9000/opengrade/ \
  -H "Authorization: AWS4-HMAC-SHA256 ..."
```

**Step 5: Restart API and Test (5 minutes)**
```bash
docker start opengrade-api
sleep 5

# Test file operations
# Try to download a restored file
curl http://localhost:3000/api/guidelines/123/pdf

# Try to upload a new file
# (verify it goes to MinIO, not backup bucket)
```

---

## Full-Stack Restoration Order

In a complete disaster (all services down), restore in this order:

### 1. Database (15 minutes) - CRITICAL
```bash
# Database is required for all other services to function
# See: Scenario 1 above
```

### 2. Keycloak (15 minutes) - CRITICAL
```bash
# API requires working authentication
# See: Scenario 2 above
```

### 3. MinIO/S3 (30 minutes) - HIGH PRIORITY
```bash
# Required for PDF export and file storage
# See: Scenario 3 above
```

### 4. API Server (5 minutes) - AUTOMATIC
```bash
# Usually requires no manual recovery (stateless)
# Health checks ensure database connectivity
docker stop opengrade-api
docker start opengrade-api
sleep 5
curl http://localhost:3000/api/health/ready
```

### 5. Web Frontend (5 minutes) - AUTOMATIC
```bash
# Usually requires no manual recovery (static assets)
# Rebuilds from source or pulls from registry
docker stop opengrade-web
docker start opengrade-web
curl http://localhost:5173
```

**Total Recovery Time:** ~45 minutes for complete stack

---

## Post-Recovery Verification Checklist

After any recovery procedure, verify all systems are working:

### Database Verification
- [ ] Database is accessible via psql
- [ ] All key tables have expected row counts
- [ ] No constraint violations
- [ ] No suspicious error messages in logs
- [ ] Query performance is normal

### Authentication Verification
- [ ] Keycloak admin console is accessible
- [ ] Realm configuration is correct
- [ ] Token endpoint responds with valid tokens
- [ ] API accepts tokens from Keycloak
- [ ] Users can log in to web interface

### File Storage Verification
- [ ] MinIO console is accessible
- [ ] Bucket exists and contains expected objects
- [ ] File download works (verify checksums if possible)
- [ ] New file uploads work
- [ ] Old PDF exports are present

### API Verification
- [ ] API health endpoint returns `status: ok`
- [ ] Readiness check includes `database: ok`
- [ ] Core API endpoints respond (guidelines, recommendations, etc.)
- [ ] PDF export endpoint works
- [ ] File upload/download works
- [ ] No 500 errors in recent logs

### Web Frontend Verification
- [ ] Web UI loads in browser
- [ ] Login flow works
- [ ] Can navigate to guidelines
- [ ] Can edit guideline content
- [ ] PDF export works
- [ ] File uploads work

### Data Integrity Verification
- [ ] Verify data matches expectations (spot-check a few guidelines)
- [ ] Check that recovered data is current (recent edits present)
- [ ] Confirm no data loss or corruption
- [ ] Run application-level integrity checks (if available)

### Smoke Tests (End-to-End)
- [ ] User can log in
- [ ] User can view a guideline
- [ ] User can edit guideline
- [ ] User can generate PDF export
- [ ] User can upload a file
- [ ] User can download a file
- [ ] Activity logging works (edits recorded)

---

## Failover Procedures

### Active-Passive Database Failover

If you have a standby database replica:

```bash
# 1. Verify primary is truly down
psql -h primary.db.example.com -U opengrade -d opengrade -c "SELECT 1" || echo "Primary down"

# 2. Promote replica to primary
# (method varies by replication technology)
# For streaming replication:
pg_ctl promote -D /var/lib/postgresql/data

# 3. Update connection string in API config
# Change DATABASE_URL to point to new primary

# 4. Restart API with new connection string
docker stop opengrade-api
docker start opengrade-api
sleep 5

# 5. Verify connectivity
curl http://localhost:3000/api/health/ready
```

### Load Balancer Failover

If using multiple API instances:

```bash
# 1. Remove failed instance from load balancer
# (method varies by LB: HAProxy, Nginx, cloud provider)

# 2. Health checks will automatically detect recovery
# No manual action needed

# 3. If instance is permanently down, replace it:
docker rm opengrade-api-old
docker run ... opengrade-api-new
# Add to load balancer

# 4. Verify traffic is balanced
# Check logs on multiple instances
```

### Multi-Region Failover

If you have geographically distributed backups:

```bash
# 1. Assess primary region health
# (ping primary data center, check backup status)

# 2. If primary is down, promote secondary region:

# 2a. Restore database from backup in secondary region
# (See Scenario 1: Restore from Backup)

# 2b. Update DNS to point to secondary region
# (method varies: Route53, Cloudflare, etc.)

# 2c. Monitor that traffic shifts to secondary region
# (can take up to TTL seconds)

# 2d. Verify all services are working in secondary region
```

---

## Backup Testing

Backups are only useful if they work. Test recovery procedures regularly:

### Monthly Backup Test

- [ ] Restore database from backup to test environment
- [ ] Verify all data integrity checks pass
- [ ] Run smoke tests against restored database
- [ ] Document any issues

### Quarterly Full Recovery Drill

- [ ] Simulate complete data center failure
- [ ] Restore all systems from backups
- [ ] Perform end-to-end smoke tests
- [ ] Measure actual RTO and RPO
- [ ] Document lessons learned

### Annual Disaster Recovery Exercise

- [ ] Full team exercise simulating major disaster
- [ ] Practice communication and coordination
- [ ] Test recovery from backups in different locations
- [ ] Validate all runbooks and procedures
- [ ] Update documentation based on findings

---

## Runbook Quick Links

- See [Incident Response Guide](./incident-response.md) for incident classification and initial response
- See [On-Call Runbook](./on-call-runbook.md) for common alerts and quick fixes
- See [Data Loss Recovery](./data-loss-recovery.md) for recovering specific data from backups
- See [Security Incident Response](./security-incident-response.md) for security-related recovery
