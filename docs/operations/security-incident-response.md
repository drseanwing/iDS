# Security Incident Response

## Incident Classification

### Severity Levels

| Level | Type | Examples |
|-------|------|---------|
| P0 - Critical | Active breach, data exfiltration | Confirmed unauthorized access to production DB, credentials leaked with confirmed misuse |
| P1 - High | Suspected breach, malware detected | Unusual API access patterns, malware found on a server, credentials exposed in logs |
| P2 - Medium | Policy violation, failed intrusion | Repeated failed auth attempts, unauthorized config change, suspicious dependency |
| P3 - Low | Anomaly requiring investigation | Unexpected traffic spike, single failed auth, misconfigured permission |

### Incident Types

**Unauthorized Access**
- Someone authenticated to a system without authorization
- Privilege escalation by a legitimate user
- Service account used outside normal patterns

**Data Breach**
- PII, PHI, or organizational data accessed or exfiltrated by an unauthorized party
- Database dump detected off-system
- Guideline content or user data exposed via misconfigured endpoint

**Malware / Supply Chain**
- Malicious dependency introduced via npm or other package manager
- Compromised container image
- Backdoor in deployed code

---

## Immediate Containment (first 30 minutes)

### Step 1: Isolate Affected Systems

```bash
# If a pod is compromised, cordon the node to prevent new scheduling
kubectl cordon <node-name>

# Scale down the affected deployment to stop active connections
kubectl scale deployment <deployment-name> --replicas=0 -n ids-prod

# If a database is involved, restrict inbound connections at the network level
# (update the security group / firewall rule to deny all except maintenance IP)
```

### Step 2: Rotate Credentials Immediately

Rotate ALL of the following, in order:

1. **Database password** - update in AWS Secrets Manager, then redeploy
2. **JWT secret** - forces all active sessions to expire
3. **S3 access keys** - for the backup and storage IAM users
4. **Third-party API keys** - any keys that may have been exposed
5. **SSH keys** - if the underlying host was accessed

```bash
# Rotate a secret in AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id ids-prod/<secret-name> \
  --secret-string "<new-value>"

# Trigger a rolling restart so pods pick up the new secret
kubectl rollout restart deployment/<deployment-name> -n ids-prod
```

### Step 3: Revoke Active Sessions

If the JWT secret has been rotated, all sessions are already invalidated. If not:

- Identify the affected user(s) via activity logs
- Remove or invalidate their auth tokens from the database if token blacklisting is implemented
- Notify affected users to re-authenticate

---

## Evidence Preservation

Preserve all evidence BEFORE making changes where possible. If containment requires immediate action, document what changed and when.

### Capture Logs

```bash
# Export pod logs before scaling down
kubectl logs deployment/<deployment-name> -n ids-prod --since=24h > /tmp/incident-$(date +%Y%m%d-%H%M%S).log

# Export previous container logs if pod has restarted
kubectl logs deployment/<deployment-name> -n ids-prod --previous >> /tmp/incident-$(date +%Y%m%d-%H%M%S).log
```

### Snapshot the Database

```bash
# Create a manual RDS snapshot before any remediation
aws rds create-db-snapshot \
  --db-instance-identifier ids-prod-postgres \
  --db-snapshot-identifier ids-incident-$(date +%Y%m%d-%H%M%S)
```

### Preserve S3 Access Logs

Enable or export S3 server access logs for the affected bucket. Do not delete any log objects.

### Document the Timeline

Record in the incident ticket:
- Time of detection
- Time of each containment action
- Who performed each action
- What was changed

---

## Notification Requirements

### Internal (within 1 hour of P0/P1 detection)

- Engineering lead
- Product owner
- Legal / compliance (if PII or PHI involved)

### Regulatory / Customer (within 72 hours for a confirmed data breach)

OpenGRADE processes health-related guideline data. Depending on jurisdiction:

- **GDPR**: Notify supervisory authority within 72 hours if personal data of EU residents is affected
- **HIPAA**: If PHI is involved, notify covered entity and follow their breach notification procedure
- **Customer contracts**: Review individual DPAs for notification timelines

Prepare a written incident summary including:
- Nature of the incident
- Categories and approximate number of records affected
- Likely consequences
- Measures taken or proposed

---

## Recovery Steps

1. **Verify containment** - confirm no active unauthorized access
2. **Patch the root cause** - fix the vulnerability before bringing systems back online
3. **Restore from a known-good state** if code or data was tampered (see `disaster-recovery.md`)
4. **Re-enable the affected service** with the patched version
5. **Monitor intensively** for 48 hours post-recovery using enhanced logging
6. **Conduct a post-mortem** within 5 business days - blameless, focused on systemic fixes

---

## Contacts

| Role | Responsibility |
|------|---------------|
| On-call engineer | First responder - see `on-call-runbook.md` |
| Engineering lead | Escalation, coordination |
| Legal / DPO | Regulatory notification decisions |
| Cloud provider support | AWS infrastructure issues |
