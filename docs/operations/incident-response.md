# Incident Response Guide

This guide defines the process for detecting, triaging, and resolving operational incidents in OpenGRADE.

## Severity Levels

Incidents are classified by impact and urgency using the following scale:

### P1 - Critical (Resolve in 15 minutes)

Production is unavailable or major data loss is occurring. Users cannot access the platform or core functionality is broken.

**Examples:**
- Database is completely unavailable
- Authentication system (Keycloak) is down
- API server is completely down (all endpoints failing)
- Active data corruption or loss
- Security breach in progress

**Response Actions:**
- Activate war room immediately (Slack channel, video call)
- Assign incident commander within 2 minutes
- Page on-call engineer immediately
- Notify stakeholders every 5 minutes
- Full focus on restoration; all other work stops

### P2 - High (Resolve in 1 hour)

Major functionality is impaired but some features are still available. Many users are affected but can work around the issue or access partial functionality.

**Examples:**
- PDF export service is down but guideline editing works
- Object storage (MinIO/S3) is unreachable but API is up
- API is responding with 50% errors
- Authentication is slow (>10 second latency)
- Database is at 80% capacity

**Response Actions:**
- Activate war room within 5 minutes
- Assign incident commander
- Page on-call engineer if no one responds in 5 minutes
- Notify stakeholders every 15 minutes
- Mitigation plan required within 10 minutes

### P3 - Medium (Resolve in 4 hours)

Non-critical functionality is degraded or unavailable. Feature is important but workarounds exist.

**Examples:**
- Specific API endpoint is slow (5-10 second latency)
- Search functionality returns incomplete results
- PDF export takes 5+ minutes
- Memory usage is high (70% utilization)
- One non-critical service is unreachable (e.g., terminology service)

**Response Actions:**
- Create ticket and assign to on-call engineer
- Notify stakeholders within 1 hour
- Investigate within 30 minutes
- No emergency escalation required unless symptoms worsen

### P4 - Low (Resolve in 1 business day)

Minor or cosmetic issues that do not impact core functionality. Users can complete their work normally.

**Examples:**
- Non-critical log messages in error level
- UI displays slightly incorrectly in edge case browser
- Non-essential feature has minor bug
- Monitoring alert fires but recovery is automatic

**Response Actions:**
- Create ticket for backlog
- No immediate escalation
- Assign during normal work hours

---

## Detection & Monitoring

### Automated Monitoring Alerts

The following systems automatically alert on critical conditions:

**Database Monitoring:**
- PostgreSQL connection pool exhaustion
- Query performance degradation (>5 second queries)
- Disk space utilization >85%
- Transaction deadlocks or blocking detected

**API Monitoring:**
- API health check endpoint fails (GET /api/health/ready)
- Error rate exceeds 5% (5xx errors)
- P95 response latency exceeds 5 seconds
- API is unreachable (TCP connection timeout)

**Object Storage Monitoring:**
- MinIO/S3 health check fails
- Upload/download operations timeout
- Disk space utilization >85%

**Authentication Monitoring:**
- Keycloak is unreachable
- Token validation failure rate exceeds 1%
- Keycloak database connection fails

**System Monitoring:**
- CPU utilization >90%
- Memory utilization >85%
- Disk space <10% free
- Container/process exits unexpectedly

### User-Reported Issues

Users may report issues via:
1. **Email to support:** Create ticket in issue tracker
2. **Slack/Chat:** Alert on-call engineer immediately
3. **UI error reporting:** Automatically logged to activity service (if API is up)

### Manual Health Checks

For active troubleshooting, check these health endpoints:

```bash
# API health
curl http://api:3000/api/health

# API readiness (includes database)
curl http://api:3000/api/health/ready

# Database connectivity
psql -h postgres -U opengrade -d opengrade -c "SELECT 1;"

# Keycloak status
curl http://keycloak:8080/auth/

# MinIO status
curl http://minio:9000/minio/health/live
```

---

## Triage Checklist

When an incident is reported, follow this triage process:

### Step 1: Create Incident Record (1 minute)

- [ ] Open new incident in tracking system (GitHub issue or Jira)
- [ ] Title: Brief description of impact
- [ ] Assign severity level (P1-P4)
- [ ] Record timestamp of first detection
- [ ] Link any relevant monitoring alerts

### Step 2: Assign Incident Commander (2 minutes)

The incident commander is responsible for:
- Coordinating all response activities
- Communicating status to stakeholders
- Making escalation decisions
- Documenting the incident

**Selection Priority:**
1. On-call engineer (if available and responding)
2. Most senior available engineer
3. Any engineer who can triage the issue

### Step 3: Identify Scope & Impact (3 minutes)

- [ ] What is broken? (specific services/features)
- [ ] How many users are affected? (estimate)
- [ ] What is the business impact? (revenue, compliance, reputation)
- [ ] Is customer data at risk?
- [ ] Is this a security issue?
- [ ] How long has this been happening?

### Step 4: Initial Assessment (5 minutes)

- [ ] Check monitoring dashboards for anomalies
- [ ] Run health check commands (see above)
- [ ] Check recent deployments or changes
- [ ] Check for known issues or documentation
- [ ] Gather logs from affected services

### Step 5: Create War Room

**For P1/P2 incidents:**
- [ ] Create Slack channel: `#incident-{date}-{number}`
- [ ] Invite incident commander, on-call engineer, relevant team members
- [ ] Start video call if complex troubleshooting needed
- [ ] Share incident tracking link in channel

**For P3/P4 incidents:**
- [ ] Update issue tracker only (may not need dedicated war room)

### Step 6: Notify Stakeholders

- [ ] Send notification to #incidents Slack channel
- [ ] Include: severity level, affected services, ETA for update
- [ ] If P1/P2, page stakeholders (not just on-call engineer)

**Stakeholder Groups:**
- **Product/Business:** If any user-facing impact
- **Customers/Users:** If P1 and external-facing
- **Security:** If any data exposure or breach is suspected

---

## Communication Templates

### Internal Notification Template

```
INCIDENT NOTIFICATION

Severity: [P1/P2/P3/P4]
Service(s) Affected: [List services]
Start Time: [UTC timestamp]

Impact Summary:
[1-2 sentences describing what is broken and who is affected]

Current Status:
[What is being done right now]

Expected Resolution Time:
[Best estimate, or "TBD"]

War Room: [Slack channel or link]

---
Incident Commander: [Name]
On-Call Engineer: [Name]
```

### External Status Page Update

Use for any P1/P2 incident affecting customers:

```
INCIDENT

[Service Name] is currently experiencing degraded performance/availability.

Symptoms:
- [What users see]
- [What they cannot do]

Affected Services:
- [List services or features]

Our team is investigating and working on a resolution.

Updates will be posted every [15] minutes.

---
Current Time: [UTC]
Incident Start: [UTC]
Duration: [Time elapsed]
```

### Resolution Notification

```
INCIDENT RESOLVED

Severity: [P1/P2/P3/P4]
Service: [Name]
Resolution Time: [HH:MM]

The [service/feature] is now fully operational.
[Brief description of what was fixed]

If you experience any further issues, please report them immediately.
```

---

## Resolution Workflow

### Phase 1: Investigate (Parallel with Mitigation)

**Timeline:** Ongoing during incident

- [ ] Collect logs from all affected services:
  ```bash
  # API logs
  docker logs opengrade-api

  # Database logs
  docker logs opengrade-postgres

  # Keycloak logs
  docker logs opengrade-keycloak

  # MinIO logs
  docker logs opengrade-minio
  ```

- [ ] Check system metrics during incident timeframe:
  - CPU, memory, disk usage
  - Network I/O
  - Database connection pool usage
  - Query performance

- [ ] Review recent changes:
  - Deployments in last 24 hours
  - Configuration changes
  - Database schema changes
  - Infrastructure changes

- [ ] Check for known issues:
  - GitHub issues, security advisories
  - Upstream library version problems
  - Known data corruption patterns

### Phase 2: Mitigate (Immediate)

**Timeline:** First 15 minutes (P1), first 30 minutes (P2)

Mitigation temporarily restores service while investigation continues.

**Quick Mitigation Steps (in priority order):**

1. **Restart service:**
   ```bash
   docker restart opengrade-api
   docker restart opengrade-postgres
   docker restart opengrade-keycloak
   docker restart opengrade-minio
   ```

2. **Clear cache/reset connections:**
   ```bash
   # Clear connection pool
   # Restart API to reset connections

   # Clear Keycloak caches (in admin console)
   # or restart Keycloak
   ```

3. **Scale up replicas:** (if Kubernetes)
   ```bash
   kubectl scale deployment opengrade-api --replicas=3
   ```

4. **Failover database:** (if high availability available)
   ```bash
   # Promote read replica to primary
   # Update DNS/connection strings
   ```

5. **Rollback recent deployment:**
   ```bash
   git revert HEAD
   npm run build
   docker build -t opengrade-api .
   docker restart opengrade-api
   ```

### Phase 3: Fix (Root Cause Remediation)

**Timeline:** Continue until root cause is fixed

Once service is stabilized (Phases 1-2), apply permanent fix:

- [ ] Identify root cause from investigation logs
- [ ] Create fix in code or configuration
- [ ] Test fix in isolated environment
- [ ] Deploy fix to production
- [ ] Verify fix resolves the issue
- [ ] Monitor closely for 1 hour after deployment

### Phase 4: Verify & Close

**Timeline:** After mitigation is stable for 15 minutes (P1) or 1 hour (P2)

- [ ] Confirm all health checks pass
- [ ] Test key user workflows:
  - Login to system
  - Create/edit guideline
  - Export PDF
  - Upload/download files
- [ ] Check monitoring dashboards for normal patterns
- [ ] Verify no related issues have emerged
- [ ] Record final resolution time
- [ ] Close incident ticket (mark for post-mortem)

---

## Post-Mortem Process

All P1 and P2 incidents require a post-mortem within 24 hours.

See [Post-Mortem Template](#post-mortem-template) below.

### Post-Mortem Template

Use this template to document the incident and lessons learned.

```
# Incident Post-Mortem

## Incident Summary
- **ID:** [Ticket number]
- **Title:** [One sentence description]
- **Date/Time:** [UTC start and end times]
- **Duration:** [HH:MM]
- **Severity:** [P1/P2/P3/P4]
- **Status:** [Resolved/Mitigated/Ongoing]

## Impact
- **Users Affected:** [Number or percentage]
- **Services Down:** [List services]
- **Business Impact:** [Revenue loss, reputation, compliance, etc.]
- **Data Impact:** [Data loss, corruption, exposure? Y/N]

## Timeline

| Time (UTC) | Event | Owner |
|---|---|---|
| 2024-03-16 14:30 | Monitoring alert: DB connection pool exhaustion | Alert system |
| 2024-03-16 14:32 | On-call engineer paged | PagerDuty |
| 2024-03-16 14:35 | War room created, investigation started | Jane (IC) |
| 2024-03-16 14:40 | Root cause identified: runaway query | Jane |
| 2024-03-16 14:42 | API restarted, connections reset | John |
| 2024-03-16 14:45 | Service restored, health checks pass | John |
| 2024-03-16 15:00 | Root cause fix deployed | Jane |
| 2024-03-16 15:15 | Incident resolved, post-mortem scheduled | Jane |

## Root Cause Analysis

### What Happened?

[Describe the sequence of events that led to the incident, not just the symptoms]

Example:
"A scheduled database maintenance task ran with incorrect parameters, locking tables for 45 minutes. This caused all connection attempts to queue up, exhausting the 20-connection pool within 2 minutes. Once exhausted, all requests failed with connection timeouts."

### Why Did It Happen?

[Identify the underlying cause, not just the trigger]

Example:
"The maintenance job parameters are stored in a configuration file that is manually edited. The parameter was changed during the last infrastructure upgrade but the documentation was not updated. The on-call engineer followed the outdated documentation, using the wrong parameters."

### Why Weren't We Protected?

[Identify control failures]

- [ ] No pre-flight validation of maintenance job parameters
- [ ] Configuration documentation not version-controlled
- [ ] No monitoring alert for table locks
- [ ] No approval process for maintenance operations
- [ ] Runbook was not consulted before manual operation

## Resolution

### Immediate Actions Taken
1. [Action - who did it - when]
2. [Action - who did it - when]
3. [Action - who did it - when]

### Permanent Fix
- **Change:** [What was changed]
- **Code/Commit:** [Link to code change if applicable]
- **Deployed:** [Date/time of deployment]
- **Verified:** [Date/time verification completed]

## Action Items

| Item | Owner | Due Date | Status |
|---|---|---|---|
| Add pre-flight validation for DB maintenance | Jane | 2024-03-23 | In Progress |
| Move configuration to version control | John | 2024-03-20 | Not Started |
| Update runbook with correct parameters | Jane | 2024-03-17 | Completed |
| Add monitoring for table locks | John | 2024-03-20 | Not Started |
| Implement approval process for maintenance | Manager | 2024-03-30 | Not Started |

## Lessons Learned

### What Went Well?
1. On-call engineer responded within 2 minutes
2. War room was effective for coordination
3. Health checks made it easy to verify recovery

### What Could Be Better?
1. Configuration documentation should be automated and version-controlled
2. Database maintenance operations should require approval
3. We should monitor for table locks and connection pool exhaustion earlier
4. Runbook should be tested before relying on it during incidents

### Knowledge Captured?
- [ ] Runbooks updated
- [ ] Monitoring rules updated
- [ ] Documentation updated
- [ ] Team training scheduled (if needed)

## Sign-Off

- **Post-Mortem Conducted By:** [Name] - [Date]
- **Reviewed By:** [Manager] - [Date]
- **Action Items Tracked In:** [Link to tracking system]

---

## For More Information

- See [On-Call Runbook](./on-call-runbook.md) for common alerts and fixes
- See [Disaster Recovery](./disaster-recovery.md) for major system failures
- See [Data Loss Recovery](./data-loss-recovery.md) for data corruption issues
- See [Security Incident Response](./security-incident-response.md) for security issues
```
