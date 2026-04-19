# OpenGRADE Docker Compose Production Deployment Guide

This guide covers production deployment of OpenGRADE using Docker Compose. For Kubernetes deployments, see [kubernetes.md](./kubernetes.md).

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Production Configuration](#production-configuration)
3. [Deployment Procedure](#deployment-procedure)
4. [Health Check Verification](#health-check-verification)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Rollback Procedure](#rollback-procedure)
7. [Backup Integration](#backup-integration)
8. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying to production, ensure the following are in place:

### Environment Variables

- [ ] Create production `.env` file with secure values (do NOT use defaults):
  ```bash
  cp .env.example .env.production
  # Edit with production values
  ```

- [ ] Required environment variables:
  - `NODE_ENV=production`
  - `LOG_LEVEL=info` (not debug)
  - `PORT=3000`
  - `DATABASE_URL=postgresql://[user]:[password]@postgres:5432/opengrade?connection_limit=10&pool_timeout=30&connect_timeout=5`
    - Tune `connection_limit` so `connection_limit * api_replicas` stays below Postgres `max_connections` (default 100). For 3 API replicas: `connection_limit=20` leaves headroom for migrations and admin sessions.
    - Raise `pool_timeout` for high-contention workloads; keep `connect_timeout` low so startup fails fast when Postgres is unreachable.
  - `KEYCLOAK_URL=https://auth.yourdomain.com` (HTTPS)
  - `KEYCLOAK_REALM=opengrade`
  - `KEYCLOAK_CLIENT_ID=opengrade-api`
  - `KEYCLOAK_CLIENT_SECRET=[secure-secret]`
  - `S3_ENDPOINT=https://s3.yourdomain.com` (HTTPS)
  - `S3_ACCESS_KEY=[secure-key]`
  - `S3_SECRET_KEY=[secure-secret]`
  - `S3_BUCKET=opengrade`
  - `CORS_ORIGIN=https://yourdomain.com`

### Secrets Management

- [ ] Secrets stored in environment variables (not in docker-compose.yml)
- [ ] Use `.env` file with restricted permissions: `chmod 600 .env.production`
- [ ] Consider external secrets management (HashiCorp Vault, AWS Secrets Manager)
- [ ] Database password complexity: minimum 32 characters, mixed case, numbers, symbols
- [ ] Keycloak admin password stored securely (not in version control)
- [ ] S3/MinIO credentials rotated regularly

### SSL/TLS Certificates

- [ ] Valid SSL certificates for production domain
- [ ] Certificate files placed in secure location: `/etc/opengrade/certs/`
- [ ] Certificate permissions: `chmod 600`
- [ ] Certificate renewal automation configured (Let's Encrypt with certbot)
- [ ] Certificate paths configured in nginx/reverse proxy

### Infrastructure Requirements

- [ ] Docker and Docker Compose installed (version >= 2.0)
- [ ] Sufficient disk space for volumes (PostgreSQL: 50GB+, MinIO: 100GB+)
- [ ] Sufficient memory (minimum 8GB, recommended 16GB)
- [ ] Network configuration: ports 80, 443, and application ports accessible
- [ ] Firewall rules configured to restrict internal service ports
- [ ] Backup storage configured and tested

### Database Preparation

- [ ] PostgreSQL data directory exists and is writable
- [ ] Database backups configured and tested
- [ ] Replication configured for high availability (optional)
- [ ] Connection pooling configured in application

### S3/MinIO Preparation

- [ ] MinIO data directory exists and is writable
- [ ] Replication configured if using distributed MinIO (optional)
- [ ] Backup buckets created
- [ ] Lifecycle policies configured for automatic cleanup

## Production Configuration

### Production docker-compose.yml

Create `docker-compose.production.yml`:

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: opengrade-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-opengrade}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: opengrade
    ports:
      - '127.0.0.1:5432:5432'  # Bind only to localhost for security
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups:ro
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER:-opengrade}']
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '10'

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: opengrade-keycloak
    restart: unless-stopped
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/opengrade
      KC_DB_USERNAME: ${DB_USER:-opengrade}
      KC_DB_PASSWORD: ${DB_PASSWORD}
      KC_DB_SCHEMA: keycloak
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN_USER}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_PROXY: reencrypt
      KC_HTTP_ENABLED: 'true'
      KC_HTTPS_CERTIFICATE_FILE: /etc/x509/https/tls.crt
      KC_HTTPS_CERTIFICATE_KEY_FILE: /etc/x509/https/tls.key
    command: start --optimized
    ports:
      - '127.0.0.1:8080:8080'
    volumes:
      - /etc/opengrade/certs:/etc/x509/https:ro
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1.5G
        reservations:
          cpus: '1'
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '10'

  minio:
    image: minio/minio:latest
    container_name: opengrade-minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
      MINIO_BROWSER_REDIRECT_URL: ${MINIO_CONSOLE_URL}
    command: server /data --console-address ":9001" --address ":9000"
    ports:
      - '127.0.0.1:9000:9000'  # S3 API
      - '127.0.0.1:9001:9001'  # Console
    volumes:
      - minio_data:/data
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '10'

  minio-init:
    image: minio/mc:latest
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      sleep 3;
      mc alias set local http://minio:9000 ${S3_ACCESS_KEY} ${S3_SECRET_KEY};
      mc mb local/opengrade --ignore-existing;
      exit 0;
      "
    logging:
      driver: json-file
      options:
        max-size: '5m'
        max-file: '5'

  redis:
    image: redis:7-alpine
    container_name: opengrade-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes --appendfsync everysec
    ports:
      - '127.0.0.1:6379:6379'
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    logging:
      driver: json-file
      options:
        max-size: '5m'
        max-file: '5'

volumes:
  postgres_data:
    driver: local
  minio_data:
    driver: local
  redis_data:
    driver: local
```

### Environment File Template

Create `.env.production`:

```bash
# ==========================
# OpenGRADE Production Config
# ==========================

# --- General ---
NODE_ENV=production
LOG_LEVEL=info
ENVIRONMENT=production

# --- Database ---
DB_USER=opengrade
DB_PASSWORD=<GENERATE_SECURE_PASSWORD_32_CHARS>
DATABASE_URL=postgresql://opengrade:<DB_PASSWORD>@postgres:5432/opengrade

# --- Redis ---
REDIS_PASSWORD=<GENERATE_SECURE_PASSWORD>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# --- Keycloak (OIDC) ---
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=<GENERATE_SECURE_PASSWORD>
KEYCLOAK_URL=https://auth.yourdomain.com
KEYCLOAK_REALM=opengrade
KEYCLOAK_CLIENT_ID=opengrade-api
KEYCLOAK_CLIENT_SECRET=<GENERATE_SECURE_SECRET>

# --- Object Storage (S3 / MinIO) ---
S3_ENDPOINT=https://s3.yourdomain.com
S3_ACCESS_KEY=<GENERATE_SECURE_ACCESS_KEY>
S3_SECRET_KEY=<GENERATE_SECURE_SECRET_KEY>
S3_BUCKET=opengrade
S3_REGION=us-east-1
MINIO_CONSOLE_URL=https://s3-console.yourdomain.com

# --- API Server ---
PORT=3000
API_HOST=0.0.0.0
CORS_ORIGIN=https://yourdomain.com
API_URL=https://api.yourdomain.com

# --- Frontend ---
VITE_API_URL=https://api.yourdomain.com/api
VITE_KEYCLOAK_URL=https://auth.yourdomain.com
VITE_KEYCLOAK_REALM=opengrade
VITE_KEYCLOAK_CLIENT_ID=opengrade-web

# --- Security ---
JWT_SECRET=<GENERATE_SECURE_SECRET>
SESSION_SECRET=<GENERATE_SECURE_SECRET>

# --- Monitoring ---
SENTRY_DSN=https://your-sentry-dsn@sentry.io/xxxxx
DATADOG_API_KEY=<YOUR_DATADOG_KEY>

# --- Backup ---
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
```

## Deployment Procedure

### Step 1: Pre-Deployment Verification

```bash
# Pull latest images
docker compose -f docker-compose.production.yml pull

# Verify configuration
docker compose -f docker-compose.production.yml config

# Check disk space
df -h /var/lib/docker/volumes/

# Check available memory
free -h
```

### Step 2: Create Backup Before Deployment

```bash
# Create backup directory
mkdir -p /data/opengrade/backups/$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
docker compose -f docker-compose.production.yml exec postgres pg_dump \
  -U opengrade opengrade > /data/opengrade/backups/$(date +%Y%m%d_%H%M%S)/postgres.sql

# Backup MinIO data
tar -czf /data/opengrade/backups/$(date +%Y%m%d_%H%M%S)/minio.tar.gz \
  /var/lib/docker/volumes/minio_data/_data/

# Backup Redis data
docker compose -f docker-compose.production.yml exec redis redis-cli BGSAVE
```

### Step 3: Start Services

```bash
# Start services in the background
docker compose -f docker-compose.production.yml up -d

# Watch logs for startup
docker compose -f docker-compose.production.yml logs -f --tail=50

# Wait for all services to be healthy
docker compose -f docker-compose.production.yml ps
```

### Step 4: Run Database Migrations

```bash
# From the API container
docker compose -f docker-compose.production.yml exec api npm run prisma:migrate -- --skip-generate
```

### Step 5: Verify All Services

```bash
# Check service health
docker compose -f docker-compose.production.yml ps

# Test connectivity
docker compose -f docker-compose.production.yml exec api \
  curl -s http://localhost:3000/health | jq .

# Verify database
docker compose -f docker-compose.production.yml exec postgres \
  psql -U opengrade -d opengrade -c "SELECT version();"
```

### Step 6: Configure Reverse Proxy

Setup nginx as a reverse proxy:

```nginx
upstream api_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream keycloak_backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

upstream minio_backend {
    server 127.0.0.1:9000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com auth.yourdomain.com s3.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}

server {
    listen 443 ssl http2;
    server_name auth.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://keycloak_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name s3.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://minio_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Health Check Verification

### Service Readiness Checks

```bash
# Check all services are running
docker compose -f docker-compose.production.yml ps

# Expected output:
# NAME                 STATUS
# opengrade-postgres   Up 2 minutes (healthy)
# opengrade-keycloak   Up 1 minute
# opengrade-minio      Up 1 minute
# opengrade-redis      Up 1 minute
```

### API Health Endpoint

```bash
# Check API health
curl -s https://api.yourdomain.com/health | jq .

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-01-15T10:30:00Z",
#   "services": {
#     "database": "ok",
#     "keycloak": "ok",
#     "s3": "ok",
#     "redis": "ok"
#   }
# }
```

### Database Connectivity

```bash
# Test database connection
docker compose -f docker-compose.production.yml exec postgres \
  psql -U opengrade -d opengrade -c "SELECT NOW();"
```

### Keycloak Status

```bash
# Check Keycloak health
curl -s https://auth.yourdomain.com/health/ready | jq .
curl -s https://auth.yourdomain.com/health/live | jq .
```

### MinIO Status

```bash
# Check MinIO health
curl -s https://s3.yourdomain.com/minio/health/live
```

### Redis Status

```bash
# Check Redis connection
docker compose -f docker-compose.production.yml exec redis \
  redis-cli -a ${REDIS_PASSWORD} ping
```

## Monitoring and Logging

### Docker Logs

```bash
# View logs for all services
docker compose -f docker-compose.production.yml logs

# Follow logs in real-time
docker compose -f docker-compose.production.yml logs -f

# View logs for specific service
docker compose -f docker-compose.production.yml logs postgres

# View last 100 lines
docker compose -f docker-compose.production.yml logs --tail=100 api
```

### Log Aggregation Setup

Configure centralized logging (ELK Stack, Datadog, etc.):

```yaml
# In docker-compose.production.yml, add:
logging:
  driver: json-file
  options:
    max-size: '10m'
    max-file: '10'
    labels: 'service=opengrade'
```

For Datadog:
```yaml
logging:
  driver: json-file
  options:
    labels: 'com.datadoghq.ad.logs=[{"service": "opengrade", "source": "docker"}]'
```

### Metrics Collection

Setup Prometheus monitoring:

```yaml
# Add to services that support Prometheus
environment:
  PROMETHEUS_METRICS_ENABLED: 'true'
  PROMETHEUS_METRICS_PORT: '9090'
```

### Log Retention

Logs are automatically rotated with the following settings:
- Maximum file size: 10MB
- Maximum files kept: 10 files
- Automatic cleanup of old logs

## Rollback Procedure

### Quick Rollback (Last Backup)

```bash
# Stop services
docker compose -f docker-compose.production.yml down

# Restore database from backup
docker run --rm \
  -v postgres_data:/var/lib/postgresql/data \
  -v /data/opengrade/backups/YYYYMMDD_HHMMSS:/backups \
  postgres:16-alpine \
  psql -U opengrade -f /backups/postgres.sql postgres

# Restore MinIO data
rm -rf /var/lib/docker/volumes/minio_data/_data/*
tar -xzf /data/opengrade/backups/YYYYMMDD_HHMMSS/minio.tar.gz -C /var/lib/docker/volumes/minio_data/_data/

# Start services with previous image version
docker compose -f docker-compose.production.yml up -d
```

### Rollback to Specific Version

```bash
# Update docker-compose.production.yml with previous image versions
# Example:
# postgres: postgres:16-alpine  # change if needed
# keycloak: quay.io/keycloak/keycloak:24.0  # change version

# Pull the old images
docker compose -f docker-compose.production.yml pull

# Stop current services
docker compose -f docker-compose.production.yml down

# Restore data from backup (see Quick Rollback above)

# Start with old version
docker compose -f docker-compose.production.yml up -d
```

### Zero-Downtime Rollback

For critical updates, use blue-green deployment:

```bash
# 1. Start "green" environment with old code
docker compose -f docker-compose.production-v2.yml up -d

# 2. Run health checks on green
# 3. Switch router to green
# 4. Keep "blue" (old) environment running for quick switch back
# 5. After verification, stop blue
docker compose -f docker-compose.production-v1.yml down
```

## Backup Integration

### Automated Backup Script

Create `/usr/local/bin/opengrade-backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/data/opengrade/backups/$(date +%Y%m%d_%H%M%S)"
RETENTION_DAYS=30
BACKUP_TYPE="${1:-full}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker compose -f /opt/opengrade/docker-compose.production.yml exec -T postgres \
  pg_dump -U opengrade opengrade | gzip > "$BACKUP_DIR/postgres.sql.gz"

# Backup MinIO data
echo "Backing up MinIO..."
docker compose -f /opt/opengrade/docker-compose.production.yml exec -T minio \
  mc mirror --preserve minio/opengrade /backups/mirror &>/dev/null || true

tar -czf "$BACKUP_DIR/minio.tar.gz" \
  /var/lib/docker/volumes/minio_data/_data/ 2>/dev/null || echo "Warning: MinIO backup incomplete"

# Backup Redis data
echo "Backing up Redis..."
docker compose -f /opt/opengrade/docker-compose.production.yml exec -T redis \
  redis-cli -a "${REDIS_PASSWORD}" BGSAVE
sleep 2
cp /var/lib/docker/volumes/redis_data/_data/dump.rdb "$BACKUP_DIR/redis.rdb"

# Create backup metadata
cat > "$BACKUP_DIR/metadata.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "type": "$BACKUP_TYPE",
  "version": "$(date +%Y%m%d_%H%M%S)",
  "hostname": "$(hostname)",
  "database_size": "$(du -sh "$BACKUP_DIR/postgres.sql.gz" | cut -f1)",
  "minio_size": "$(du -sh "$BACKUP_DIR/minio.tar.gz" | cut -f1)"
}
EOF

# Upload to offsite storage (optional)
# aws s3 cp "$BACKUP_DIR" s3://opengrade-backups/ --recursive

# Cleanup old backups
find /data/opengrade/backups -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

### Cron Job Setup

```bash
# Add to crontab
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/opengrade-backup.sh full >> /var/log/opengrade-backup.log 2>&1

# Weekly full backup (Sunday)
0 3 * * 0 /usr/local/bin/opengrade-backup.sh full >> /var/log/opengrade-backup.log 2>&1

# Verify backup integrity daily
0 4 * * * /usr/local/bin/opengrade-verify-backups.sh >> /var/log/opengrade-backup-verify.log 2>&1
```

### Backup Verification

Create `/usr/local/bin/opengrade-verify-backups.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/data/opengrade/backups"
ALERT_EMAIL="ops@yourdomain.com"

# Check latest backup exists and is recent
LATEST_BACKUP=$(ls -td "$BACKUP_DIR"/*/ | head -1)
BACKUP_TIME=$(stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
AGE=$((($CURRENT_TIME - $BACKUP_TIME) / 3600))

if [ $AGE -gt 25 ]; then
    echo "WARNING: Backup is $AGE hours old" | mail -s "OpenGRADE Backup Alert" "$ALERT_EMAIL"
fi

# Verify backup files
if [ ! -f "$LATEST_BACKUP/postgres.sql.gz" ]; then
    echo "ERROR: PostgreSQL backup missing" | mail -s "OpenGRADE Backup Error" "$ALERT_EMAIL"
    exit 1
fi

if [ ! -f "$LATEST_BACKUP/minio.tar.gz" ]; then
    echo "ERROR: MinIO backup missing" | mail -s "OpenGRADE Backup Error" "$ALERT_EMAIL"
    exit 1
fi

# Test database backup integrity
if ! gzip -t "$LATEST_BACKUP/postgres.sql.gz"; then
    echo "ERROR: PostgreSQL backup is corrupted" | mail -s "OpenGRADE Backup Error" "$ALERT_EMAIL"
    exit 1
fi

echo "Backup verification passed"
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.production.yml logs postgres

# Common issues:
# 1. Port already in use
netstat -tulpn | grep 5432

# 2. Volume permission issues
ls -la /var/lib/docker/volumes/postgres_data/

# 3. Insufficient resources
docker stats
```

### Database Connection Issues

```bash
# Test connection directly
docker compose -f docker-compose.production.yml exec postgres \
  psql -U opengrade -d opengrade -c "SELECT 1;"

# Check connection string
echo $DATABASE_URL

# Verify database exists
docker compose -f docker-compose.production.yml exec postgres \
  psql -U opengrade -c "\l"
```

### High Memory Usage

```bash
# Check which containers use memory
docker stats

# Limit memory for specific service:
# In docker-compose.production.yml:
deploy:
  resources:
    limits:
      memory: 1G

# Restart service
docker compose -f docker-compose.production.yml restart postgres
```

### Network Connectivity

```bash
# Check if containers can reach each other
docker compose -f docker-compose.production.yml exec api \
  curl -v http://postgres:5432

# Check DNS resolution
docker compose -f docker-compose.production.yml exec api \
  nslookup postgres
```

### Disk Space Issues

```bash
# Check disk usage
du -sh /var/lib/docker/volumes/*/

# Clean up old images
docker image prune -a

# Clean up unused volumes
docker volume prune
```

## Summary

Key points for production Docker Compose deployment:

1. **Always use environment variables** for secrets, never hardcode in docker-compose.yml
2. **Enable health checks** for all services to detect failures early
3. **Set resource limits** to prevent runaway containers
4. **Configure logging** with rotation to prevent disk space issues
5. **Automate backups** with verification and offsite storage
6. **Use a reverse proxy** (nginx) for SSL/TLS termination
7. **Monitor service health** continuously
8. **Document rollback procedures** and test them regularly
9. **Restrict port access** to localhost where possible
10. **Keep certificates updated** with automated renewal

For production environments with high availability requirements, consider migrating to Kubernetes (see [kubernetes.md](./kubernetes.md)).
