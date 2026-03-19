# On-Call Runbook

Quick reference guide for common alerts and their resolution steps. Use this for rapid diagnosis and mitigation during incidents.

---

## Health Check Endpoints

Before investigating specific issues, always check these endpoints first:

```bash
# API liveness (responds if process is running)
curl http://api:3000/api/health

# API readiness (includes database connectivity)
curl http://api:3000/api/health/ready

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-03-16T14:30:00.000Z",
#   "service": "opengrade-api",
#   "checks": { "database": "ok" }
# }
```

---

## Alert: Database Connection Pool Exhaustion

**Severity:** P2 (High)

**Symptoms:**
- API responds with `Error: connect ECONNREFUSED` or similar
- Monitoring shows "Database pool exhausted"
- Multiple application instances show increased latency
- Users report API timeouts

**Diagnosis (2 minutes):**

```bash
# Check current connection count
psql -h postgres -U opengrade -d opengrade << 'EOF'
SELECT
  datname,
  usename,
  COUNT(*) as connections
FROM pg_stat_activity
GROUP BY datname, usename
ORDER BY connections DESC;

-- Check for idle connections
SELECT
  pid,
  usename,
  application_name,
  state,
  state_change,
  query
FROM pg_stat_activity
WHERE state = 'idle'
ORDER BY state_change DESC
LIMIT 10;
EOF
```

**Quick Fixes (in priority order):**

### Option 1: Restart API (2 minutes) - Resets Connection Pool
```bash
docker restart opengrade-api
sleep 10
curl http://api:3000/api/health/ready
```

**Why this works:** Each API instance manages its own connection pool. Restarting returns connections to available state.

### Option 2: Kill Idle Connections (3 minutes)
```bash
# Identify long-running idle connections
psql -h postgres -U opengrade -d opengrade << 'EOF'
SELECT
  pid,
  usename,
  application_name,
  EXTRACT(EPOCH FROM (NOW() - state_change)) as idle_seconds,
  query
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes'
ORDER BY state_change;

-- Kill specific connection
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE pid != pg_backend_pid()
  AND application_name = 'opengrade-api'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
EOF
```

### Option 3: Increase Pool Size (5 minutes) - Temporary, document for permanent fix
```bash
# Edit API configuration to increase pool size
# In apps/api/.env:
# DATABASE_CONNECTION_POOL_SIZE=20  # Increase from default

# Redeploy API with new setting
docker restart opengrade-api
```

**Root Cause Investigation (during mitigation):**

- [ ] Check for runaway queries consuming connections (see Alert: API High Latency)
- [ ] Check application logs for unclosed connection handles
- [ ] Review for recent code changes affecting database usage
- [ ] Monitor query execution time - slow queries hold connections longer

**Prevention:**
- Implement connection pool monitoring
- Set aggressive idle timeout (5-10 minutes)
- Add alerts at 50%, 75%, 90% pool utilization
- Implement max pool size limits to prevent unlimited growth

**Escalation:**
If pool exhaustion happens multiple times per day, escalate to development team - indicates code issue, not just momentary spike.

---

## Alert: API High Latency / Timeout

**Severity:** P2 (High)

**Symptoms:**
- API responses take >5 seconds
- Requests timeout after 30 seconds
- Load balancer marks instances as unhealthy
- User reports that guideline operations are very slow

**Diagnosis (3 minutes):**

```bash
# Check API logs for slow endpoints
docker logs opengrade-api | grep "took.*ms" | sort -t'ms' -k2 -nr | head -10

# Check database query performance
psql -h postgres -U opengrade -d opengrade << 'EOF'
-- Find currently running queries
SELECT
  pid,
  usename,
  application_name,
  EXTRACT(EPOCH FROM (NOW() - query_start)) as query_seconds,
  query
FROM pg_stat_activity
WHERE query != 'idle'
  AND query_start < NOW() - INTERVAL '5 seconds'
ORDER BY query_seconds DESC;

-- Find slow queries (from query analyzer)
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
EOF

# Check system resources
docker stats --no-stream opengrade-api opengrade-postgres | \
  awk 'NR==1 || /^(opengrade|CONTAINER)/'
```

**Quick Fixes (in priority order):**

### Option 1: Scale Horizontal (Add More API Instances) - 3 minutes
```bash
# If using Docker Compose with multiple instances:
docker-compose -f infra/docker-compose.yml up -d --scale api=3

# If using Kubernetes:
kubectl scale deployment opengrade-api --replicas=3
```

**Why this works:** Distributes requests across more instances, reducing per-instance latency.

### Option 2: Kill Long-Running Query (3 minutes)
```bash
# Identify and kill problematic query
psql -h postgres -U opengrade -d opengrade << 'EOF'
-- Find long-running queries
SELECT
  pid,
  query_start,
  EXTRACT(EPOCH FROM (NOW() - query_start)) as duration_seconds,
  query
FROM pg_stat_activity
WHERE query_start < NOW() - INTERVAL '30 seconds'
  AND query NOT ILIKE '%pg_stat%'
ORDER BY duration_seconds DESC;

-- Kill specific query
SELECT pg_terminate_backend(12345);  -- Replace 12345 with actual pid
EOF
```

### Option 3: Restart API (5 minutes) - Nuclear Option
```bash
# Only do this if other options don't work
docker restart opengrade-api
sleep 10
curl http://api:3000/api/health/ready
```

**Root Cause Investigation (during mitigation):**

- [ ] **Runaway Query:** Is there a slow database query? (Check `query_start` in `pg_stat_activity`)
- [ ] **Resource Starvation:** Is CPU/memory at 90%+? (Check `docker stats`)
- [ ] **Lock Contention:** Are queries waiting on locks? (Check `pg_locks`)
- [ ] **Full Table Scan:** Is a query doing full table scan instead of using index?

```bash
# Check for lock contention
psql -h postgres -U opengrade -d opengrade << 'EOF'
SELECT
  l.pid,
  l.usename,
  l.application_name,
  l.lock_type,
  l.mode,
  l.granted,
  s.query
FROM pg_locks l
JOIN pg_stat_activity s ON l.pid = s.pid
WHERE NOT l.granted
ORDER BY s.query_start;
EOF

# Explain slow query to find missing indexes
EXPLAIN ANALYZE
SELECT * FROM guidelines WHERE title ILIKE '%some-text%'
ORDER BY updated_at DESC
LIMIT 10;
```

**Prevention:**
- Monitor slow query log (>1 second)
- Add indexes on frequently filtered columns (title, status, etc.)
- Set statement timeout to prevent runaway queries
- Implement caching for common queries (Redis, in-memory cache)

---

## Alert: PDF Export Job Stuck in PROCESSING

**Severity:** P2 (High)

**Symptoms:**
- User requests PDF export but status never changes from PROCESSING
- Export job hangs for >30 minutes
- PDF never appears in S3 storage
- Monitoring shows high CPU/memory on worker process

**Diagnosis (2 minutes):**

```bash
# Check PDF export job status in database
psql -h postgres -U opengrade -d opengrade << 'EOF'
SELECT
  id,
  guideline_id,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds,
  error
FROM pdf_export_jobs
WHERE status IN ('PENDING', 'PROCESSING')
ORDER BY created_at DESC
LIMIT 10;
EOF

# Check for stuck processes
docker exec opengrade-api ps aux | grep -i pdf

# Check for recent errors in API logs
docker logs opengrade-api | grep -i "pdf\|error" | tail -20
```

**Quick Fixes (in priority order):**

### Option 1: Kill Stuck PDF Job and Restart (3 minutes)
```bash
# First, update job status to mark it failed
psql -h postgres -U opengrade -d opengrade << 'EOF'
UPDATE pdf_export_jobs
SET status = 'FAILED',
    error = 'Job killed by operator - likely stuck in infinite loop'
WHERE status = 'PROCESSING'
  AND created_at < NOW() - INTERVAL '30 minutes';
EOF

# Restart API (PDF jobs are background tasks)
docker restart opengrade-api
sleep 10

# User can retry the PDF export
```

### Option 2: Investigate PDF Generation Issue (5 minutes)
```bash
# Check if it's a template issue
psql -h postgres -U opengrade -d opengrade << 'EOF'
SELECT
  id,
  guideline_id,
  options  -- contains template selection
FROM pdf_export_jobs
WHERE status = 'PROCESSING'
ORDER BY created_at DESC
LIMIT 1;
EOF

# If template is corrupted, user can try with different template
# Or wait for fix if template issue is discovered
```

### Option 3: Check Disk Space (2 minutes)
```bash
# PDF generation requires temp disk space
df -h /tmp /

# If disk is full, clean up temp files
docker exec opengrade-api rm -rf /tmp/pdf-* /tmp/tmp*
```

**Root Cause Investigation:**

- [ ] **Out of Memory:** Check if process was OOM killed (`docker logs`)
- [ ] **Infinite Loop:** Check API code for PDF generation logic
- [ ] **Template Issue:** Is PDF template valid? Try regenerating with simple template
- [ ] **Timeout:** Did PDF generation just take very long? Check file in S3

```bash
# Check if file actually exists in S3 despite job showing PROCESSING
aws s3 ls s3://opengrade/pdf-exports/ \
  --recursive | grep guideline-id-here
```

**Prevention:**
- Add timeout to PDF generation (kill after 5 minutes)
- Monitor PDF generation time (alert if >3 minutes)
- Validate templates during export request, before queuing
- Implement separate queue with max concurrency (prevent 100 PDFs at once)

---

## Alert: S3 / MinIO Unreachable

**Severity:** P2 (High)

**Symptoms:**
- Users cannot download files
- PDF export fails with storage error
- Monitoring shows MinIO is unreachable
- API logs show "Connection timeout to MinIO"

**Diagnosis (2 minutes):**

```bash
# Check MinIO container status
docker ps | grep minio

# Check MinIO health endpoint
curl http://localhost:9000/minio/health/live

# Check MinIO logs
docker logs opengrade-minio | tail -20

# Test connectivity from API container
docker exec opengrade-api \
  curl -v http://minio:9000/minio/health/live

# Check if bucket exists
docker run --rm --network host minio/mc:latest \
  mc ls minio/opengrade --insecure
```

**Quick Fixes (in priority order):**

### Option 1: Restart MinIO (2 minutes)
```bash
docker restart opengrade-minio
sleep 10

# Verify it came back up
curl http://localhost:9000/minio/health/live
```

**Why this works:** MinIO may have crashed or become unresponsive due to memory/disk issue.

### Option 2: Check Disk Space (2 minutes)
```bash
# MinIO needs disk space to operate
docker exec opengrade-minio df -h /data

# If disk is full, delete old/unnecessary files
# Or add more disk space and restart
```

### Option 3: Restart API (2 minutes)
```bash
# API caches S3 client, restart forces reconnection
docker restart opengrade-api
sleep 10

# Verify connectivity
curl http://api:3000/api/health/ready
```

**Root Cause Investigation:**

- [ ] **Disk Full:** Is MinIO data directory full? (`docker exec opengrade-minio df -h /data`)
- [ ] **Network Issue:** Can API reach MinIO? (`docker exec opengrade-api ping minio`)
- [ ] **Crashed Process:** Did MinIO crash? (Check logs and container status)
- [ ] **Port Conflict:** Is something else using port 9000? (`lsof -i :9000`)

**Prevention:**
- Monitor MinIO disk usage (alert at 80%, 90%)
- Set up MinIO in high-availability mode (multiple replicas)
- Implement object storage failover (primary MinIO → backup S3)
- Add health checks for MinIO in monitoring

---

## Alert: Keycloak Token Validation Failure

**Severity:** P2 (High)

**Symptoms:**
- Users cannot log in
- API rejects valid tokens with 401 Unauthorized
- Monitoring shows "Token validation failure" spike
- Users see "Invalid token" or "Session expired" errors

**Diagnosis (2 minutes):**

```bash
# Check Keycloak status
curl http://localhost:8080/auth/

# Check Keycloak logs
docker logs opengrade-keycloak | tail -30

# Verify realm exists and is configured
curl http://localhost:8080/auth/realms/opengrade

# Try to get a token (test authentication)
curl -X POST \
  http://localhost:8080/auth/realms/opengrade/protocol/openid-connect/token \
  -d "client_id=opengrade-api" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"

# Check API logs for token errors
docker logs opengrade-api | grep -i "token\|auth" | tail -20
```

**Quick Fixes (in priority order):**

### Option 1: Restart Keycloak (5 minutes)
```bash
docker restart opengrade-keycloak
sleep 30  # Keycloak takes longer to start

# Verify it came back up
curl http://localhost:8080/auth/realms/opengrade
```

### Option 2: Verify Client Configuration (3 minutes)
```bash
# Get Keycloak admin token
export ADMIN_TOKEN=$(curl -s -X POST \
  http://localhost:8080/auth/realms/master/protocol/openid-connect/token \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  | jq -r '.access_token')

# Check opengrade-api client configuration
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/auth/admin/realms/opengrade/clients \
  | jq '.[] | select(.clientId=="opengrade-api")'
```

### Option 3: Clear Token Cache (2 minutes)
```bash
# Token validation cache might be stale
# Restart API to clear cache
docker restart opengrade-api
sleep 10

curl http://api:3000/api/health/ready
```

**Root Cause Investigation:**

- [ ] **Keycloak Down:** Is Keycloak responding? (Check health endpoint)
- [ ] **Database Connection:** Is Keycloak database up? (Check Keycloak logs)
- [ ] **Client Configuration:** Is client secret correct? Is client enabled?
- [ ] **Realm Configuration:** Is realm enabled? Are token settings correct?

**Prevention:**
- Monitor Keycloak health (separate health check endpoint)
- Set up Keycloak high-availability mode
- Cache token validation results in API (reduce load on Keycloak)
- Monitor token generation and validation latency

---

## Alert: Disk Space Critical

**Severity:** P2 (High) - if root partition; P3 (Medium) - if other partition

**Symptoms:**
- Monitoring alert: "Disk usage >90%"
- Services fail to write logs or data
- Applications crash with "No space left on device" errors
- Database stops accepting writes

**Diagnosis (1 minute):**

```bash
# Check disk usage overall
df -h

# Find large directories
du -sh /var/lib/docker/* 2>/dev/null | sort -hr | head -10

# Check Docker container disk usage
docker ps -q | xargs -I {} sh -c 'echo {} && docker inspect {} | grep "SizeRootFs"'

# Check database size
psql -h postgres -U opengrade -d opengrade << 'EOF'
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF
```

**Quick Fixes (in priority order):**

### Option 1: Clean Up Docker (5 minutes)
```bash
# Remove unused Docker images, volumes, containers
docker system prune -a --volumes

# This removes:
# - All stopped containers
# - All unused images
# - All unused volumes
```

**CAUTION:** This is destructive. Only do if you're sure you don't need old images.

### Option 2: Clean Up Logs (3 minutes)
```bash
# Docker logs can grow very large
# Option A: Truncate logs
docker exec opengrade-api sh -c '> /proc/1/fd/1'
docker exec opengrade-postgres sh -c '> /proc/1/fd/1'

# Option B: Configure log rotation for future
# Create /etc/docker/daemon.json:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}

# Restart Docker daemon:
systemctl restart docker
```

### Option 3: Archive Old Files (5 minutes)
```bash
# Find and compress old files
find /var/lib/postgresql/data -type f -mtime +30 -size +100M \
  | xargs gzip

# Or move to external storage
find /backups -type f -mtime +30 \
  | xargs -I {} mv {} /archive/
```

**Root Cause Investigation:**

- [ ] **Log Files:** Are application logs growing too fast?
- [ ] **Database:** Is database size growing unexpectedly?
- [ ] **Object Storage:** Is MinIO storage full?
- [ ] **Temporary Files:** Are temp directories accumulating?

**Prevention:**
- Set up log rotation (max 100MB per log, keep 3 files)
- Monitor disk usage trends (alert at 70%, 80%, 90%)
- Set up separate partitions for critical services
- Implement data retention policies (delete old exports, activity logs, etc.)

---

## Alert: Out of Memory (OOM) Kill

**Severity:** P2 (High)

**Symptoms:**
- Container suddenly stops or restarts
- "Killed" message in logs
- Memory usage was at 99% before death
- User operations fail when attempting memory-intensive tasks (large PDF export, big guideline load)

**Diagnosis (2 minutes):**

```bash
# Check if container was OOM killed
docker inspect opengrade-api | jq '.State.OOMKilled'

# Check memory usage
docker stats --no-stream opengrade-api opengrade-postgres

# Check system memory
free -h

# Check process memory
top -b -n 1 | head -20
```

**Quick Fixes (in priority order):**

### Option 1: Restart Container (1 minute)
```bash
docker restart opengrade-api

# Verify it came back up
curl http://api:3000/api/health/ready
```

### Option 2: Increase Memory Limit (5 minutes)
```bash
# Update Docker Compose memory limit
# In infra/docker-compose.yml:
# services:
#   api:
#     deploy:
#       resources:
#         limits:
#           memory: 2G  # Increase from 1G

docker-compose -f infra/docker-compose.yml up -d --force-recreate opengrade-api
```

### Option 3: Scale Horizontal (3 minutes)
```bash
# Distribute load across multiple instances
docker-compose -f infra/docker-compose.yml up -d --scale api=2
```

**Root Cause Investigation:**

- [ ] **Memory Leak:** Is memory growing over time? (Monitor memory usage)
- [ ] **Large Requests:** Is there a specific endpoint causing high memory?
- [ ] **Caching Issue:** Is cache growing unbounded?

```bash
# Check for memory leaks - monitor over time
watch 'docker stats --no-stream opengrade-api | tail -1'

# Check API logs for large data operations
docker logs opengrade-api | grep -i "loading\|processing\|guideline" | tail -20
```

**Prevention:**
- Monitor memory usage continuously (alert at 70%, 80%)
- Implement pagination for large data queries
- Add memory limits to resource-intensive operations (PDF generation, big imports)
- Implement periodic container restarts (if memory leaks exist)
- Upgrade Node.js runtime (if on old version with memory issues)

---

## Alert: Service Health Check Endpoint Unavailable

**Severity:** P1 (Critical) - if database check is failing; P2 (High) - if only liveness check is failing

**Symptoms:**
- `GET /api/health` returns 5xx error or timeout
- `GET /api/health/ready` returns 503 Service Unavailable
- Load balancer marks all instances as unhealthy
- All user requests fail

**Diagnosis (1 minute):**

```bash
# Check if API process is running
docker ps | grep opengrade-api

# Check API logs for startup errors
docker logs opengrade-api | tail -50

# Try to connect to API
curl -v http://localhost:3000/api/health

# Check database connectivity
psql -h postgres -U opengrade -d opengrade -c "SELECT 1"
```

**Quick Fixes (in priority order):**

### Option 1: Restart API (1 minute)
```bash
docker stop opengrade-api
sleep 2
docker start opengrade-api
sleep 5

curl http://localhost:3000/api/health/ready
```

### Option 2: Check Database (2 minutes)
```bash
# Health check also checks database
# If database is down, health/ready will fail
psql -h postgres -U opengrade -d opengrade -c "SELECT 1"

# If database is down, see: Alert: Database Connection Pool Exhaustion
```

### Option 3: Check Logs for Specific Errors (3 minutes)
```bash
docker logs opengrade-api | grep -i error | tail -20

# Common errors:
# - "connect ECONNREFUSED" = database not running
# - "EADDRINUSE" = port 3000 already in use
# - "TypeError" = code error during startup
```

---

## Service Health Check Endpoints to Monitor

Add these to your monitoring system:

| Endpoint | Purpose | Success Criteria |
|----------|---------|------------------|
| `GET /api/health` | Liveness - is API running? | Status 200, `status: ok` |
| `GET /api/health/ready` | Readiness - is API ready for traffic? | Status 200, `checks.database: ok` |
| PostgreSQL health | Can database accept connections? | `pg_isready` exits with 0 |
| Keycloak `/auth/realms/opengrade` | Is realm accessible? | Status 200, realm config returned |
| MinIO `/minio/health/live` | Is object storage accessible? | Status 200 |

**Example Prometheus monitoring:**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'opengrade-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'  # If Prometheus metrics are exposed
```

**Example health check script:**

```bash
#!/bin/bash
# save as: /usr/local/bin/check-opengrade-health.sh

API_READY=$(curl -s http://api:3000/api/health/ready | jq -r '.checks.database')
DB_READY=$(pg_isready -h postgres -U opengrade -d opengrade > /dev/null 2>&1 && echo "ok" || echo "not-ok")
KEYCLOAK_READY=$(curl -s http://keycloak:8080/auth/realms/opengrade > /dev/null 2>&1 && echo "ok" || echo "not-ok")
MINIO_READY=$(curl -s http://minio:9000/minio/health/live > /dev/null 2>&1 && echo "ok" || echo "not-ok")

echo "API: $API_READY, Database: $DB_READY, Keycloak: $KEYCLOAK_READY, MinIO: $MINIO_READY"

if [ "$API_READY" == "ok" ] && [ "$DB_READY" == "ok" ]; then
  exit 0  # Healthy
else
  exit 1  # Unhealthy
fi
```

---

## Quick Escalation Checklist

If you've tried the quick fixes above and the issue persists:

- [ ] Check that you're looking at the right logs/services
- [ ] Confirm the issue is still happening (not intermittent)
- [ ] Gather all relevant logs (API, database, Keycloak, MinIO)
- [ ] Document exact error messages
- [ ] Create incident ticket with all information
- [ ] Page on-call engineer or escalate to team lead
- [ ] Follow incident response procedures in [Incident Response Guide](./incident-response.md)

---

## Contact & Escalation

- **On-Call Engineer:** [Depends on rotation]
- **Team Lead:** [Name, phone, email]
- **Security Team:** [For security incidents]
- **Database Administrator:** [For database-specific issues]

See [Incident Response Guide](./incident-response.md) for severity levels and escalation procedures.
