# OpenGRADE Kubernetes Deployment

This directory contains Kubernetes manifests and Helm charts for deploying OpenGRADE to production Kubernetes clusters.

## Architecture Overview

OpenGRADE is deployed as a set of microservices on Kubernetes:

```
┌─────────────────────────────────────────────────────────────┐
│                    Ingress Controller (nginx)                 │
│              TLS Termination & Routing (api.*, auth.*)        │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
        ┌──────▼──┐    ┌─────▼──┐    ┌─────▼──┐
        │   API    │    │  Auth  │    │ Frontend│
        │ Deployment│   │Keycloak│    │ Deployment
        │ (NestJS) │    │        │    │ (React)
        │   x3     │    │  x2    │    │   x3
        └──────┬──┘    └────┬───┘    └────┬────┘
               │            │             │
        ┌──────▴──────┬─────┴──────┬─────┴──────┐
        │             │            │            │
   ┌────▼──┐  ┌─────▼───┐  ┌────▼──┐  ┌──────▼───┐
   │   DB  │  │ MinIO   │  │ Redis │  │ Keycloak│
   │StatefulSet (S3)   │ StatefulSet│  │ Database
   │(PostgreSQL)  x1   │   x1       │  │
   │  x1   │  └────────┘  └────────┘  └─────────┘
   └───────┘
   Data: Persistent Volumes
```

## Components

### Core Services

1. **API (NestJS)**
   - Deployment with 3 replicas (configurable)
   - Rolling updates
   - Health checks and readiness probes
   - Resource requests and limits
   - Pod anti-affinity for distribution

2. **Frontend (React)**
   - Deployment with 3 replicas (configurable)
   - Served via nginx embedded in container
   - Cache headers and compression
   - Static asset caching

3. **Keycloak (Identity)**
   - StatefulSet with 2 replicas
   - Persistent volume for configuration
   - Database backend (shared PostgreSQL)
   - Service for internal discovery

4. **PostgreSQL (Database)**
   - StatefulSet with 1 replica
   - Persistent volume for data
   - Automated backups via CronJob
   - Connection pooling configured

5. **MinIO (Object Storage)**
   - StatefulSet with 1 replica
   - Persistent volume for data
   - S3-compatible API
   - Web console disabled by default

6. **Redis (Cache)**
   - StatefulSet with 1 replica
   - Persistent volume for durability
   - Password-protected
   - Expiration policies configured

### Supporting Infrastructure

- **Ingress**: nginx ingress controller with TLS termination
- **PersistentVolumes**: Storage for databases and object storage
- **ConfigMaps**: Application configuration
- **Secrets**: Sensitive credentials and certificates
- **Services**: Internal networking (ClusterIP, headless)
- **NetworkPolicies**: Network segmentation
- **PodDisruptionBudgets**: High availability during cluster updates
- **HorizontalPodAutoscalers**: Auto-scaling based on metrics

## Directory Structure

```
infra/k8s/
├── README.md                          # This file
├── helm/
│   ├── Chart.yaml                     # Helm chart metadata
│   ├── values.yaml                    # Default values
│   ├── values-dev.yaml                # Development overrides
│   ├── values-staging.yaml            # Staging overrides
│   ├── values-prod.yaml               # Production overrides
│   └── templates/
│       ├── api-deployment.yaml        # API service deployment
│       ├── api-service.yaml           # API ClusterIP service
│       ├── web-deployment.yaml        # Frontend deployment
│       ├── web-service.yaml           # Frontend ClusterIP service
│       ├── postgres-statefulset.yaml  # Database (StatefulSet)
│       ├── postgres-service.yaml      # Database service
│       ├── keycloak-statefulset.yaml  # Identity provider
│       ├── keycloak-service.yaml      # Keycloak service
│       ├── minio-statefulset.yaml     # Object storage
│       ├── minio-service.yaml         # MinIO service
│       ├── redis-statefulset.yaml     # Cache layer
│       ├── redis-service.yaml         # Redis service
│       ├── ingress.yaml               # TLS ingress routing
│       ├── configmap.yaml             # Application config
│       ├── secrets.yaml               # Credentials (encrypted)
│       ├── pvc.yaml                   # Persistent volumes
│       ├── networkpolicy.yaml         # Network segmentation
│       ├── hpa.yaml                   # Auto-scaling policies
│       ├── pdb.yaml                   # Pod disruption budgets
│       ├── backup-cronjob.yaml        # Database backups
│       └── monitoring.yaml            # Prometheus scraping
```

## Prerequisites

- Kubernetes cluster 1.24+ (tested on 1.27, 1.28, 1.29)
- Helm 3.12+
- kubectl 1.27+
- Ingress Controller (nginx recommended)
- Storage provisioner (local, EBS, NFS, etc.)
- Load Balancer for Ingress (cloud provider or metallb)

### Verified Kubernetes Distributions

- EKS (AWS Elastic Kubernetes Service)
- GKE (Google Kubernetes Engine)
- AKS (Azure Kubernetes Service)
- DigitalOcean Kubernetes
- linode Kubernetes Engine
- Self-managed Kubernetes

## Quick Start

### 1. Create Namespace

```bash
kubectl create namespace opengrade
kubectl config set-context --current --namespace=opengrade
```

### 2. Create Secrets

```bash
# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
KEYCLOAK_PASSWORD=$(openssl rand -base64 32)
KEYCLOAK_CLIENT_SECRET=$(openssl rand -base64 32)
S3_ACCESS_KEY=$(openssl rand -base64 12)
S3_SECRET_KEY=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Create secret
kubectl create secret generic opengrade-secrets \
  --from-literal=db-password="$DB_PASSWORD" \
  --from-literal=keycloak-password="$KEYCLOAK_PASSWORD" \
  --from-literal=keycloak-client-secret="$KEYCLOAK_CLIENT_SECRET" \
  --from-literal=s3-access-key="$S3_ACCESS_KEY" \
  --from-literal=s3-secret-key="$S3_SECRET_KEY" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  -n opengrade
```

### 3. Install with Helm

```bash
# Add repo (if using chart repository)
helm repo add opengrade https://charts.yourdomain.com
helm repo update

# Install from local directory
helm install opengrade ./helm \
  -n opengrade \
  -f ./helm/values-prod.yaml \
  --create-namespace

# Or using specific environment values
helm install opengrade ./helm \
  -n opengrade \
  -f ./helm/values.yaml \
  -f ./helm/values-prod.yaml
```

### 4. Verify Installation

```bash
# Check all pods are running
kubectl get pods -n opengrade

# Check services
kubectl get svc -n opengrade

# Check ingress
kubectl get ingress -n opengrade

# Watch logs
kubectl logs -n opengrade -l app=api -f
```

## Environment-Specific Deployments

### Development

```bash
helm install opengrade ./helm \
  -n opengrade-dev \
  -f ./helm/values.yaml \
  -f ./helm/values-dev.yaml \
  --create-namespace
```

Development features:
- 1 replica for each service (cost savings)
- Smaller resource limits
- No TLS or minimal TLS
- Logging level: debug
- No autoscaling

### Staging

```bash
helm install opengrade ./helm \
  -n opengrade-staging \
  -f ./helm/values.yaml \
  -f ./helm/values-staging.yaml \
  --create-namespace
```

Staging features:
- 2 replicas for each service
- Production-like resource allocation
- TLS enabled
- Logging level: info
- Basic autoscaling (2-5 replicas)

### Production

```bash
helm install opengrade ./helm \
  -n opengrade-prod \
  -f ./helm/values.yaml \
  -f ./helm/values-prod.yaml \
  --create-namespace
```

Production features:
- 3+ replicas for each service
- Full resource limits and requests
- TLS mandatory
- Logging level: info
- Advanced autoscaling (3-10 replicas)
- Pod disruption budgets
- Network policies
- Automated backups
- Monitoring and alerts

## Common Operations

### View Deployment Status

```bash
kubectl get all -n opengrade
kubectl describe deployment api -n opengrade
kubectl logs -n opengrade -l app=api --tail=50 -f
```

### Update Configuration

```bash
# Update values and upgrade release
helm upgrade opengrade ./helm \
  -n opengrade \
  -f ./helm/values-prod.yaml
```

### Scale Replicas

```bash
# Manual scaling
kubectl scale deployment/api --replicas=5 -n opengrade

# View HPA status
kubectl get hpa -n opengrade
```

### Database Operations

```bash
# Connect to database pod
kubectl exec -it postgres-0 -n opengrade -- psql -U opengrade -d opengrade

# Backup database
kubectl exec -it postgres-0 -n opengrade -- pg_dump -U opengrade opengrade | gzip > backup.sql.gz

# View data directory
kubectl exec postgres-0 -n opengrade -- ls -la /var/lib/postgresql/data/
```

### View Logs

```bash
# All pods
kubectl logs -n opengrade --all-containers=true -f

# Specific pod
kubectl logs -n opengrade api-0 -c api

# Previous logs (if pod crashed)
kubectl logs -n opengrade api-0 --previous

# All pods of a deployment
kubectl logs -n opengrade -l app=api --tail=100 -f
```

### Port Forwarding

```bash
# Forward API to local machine
kubectl port-forward -n opengrade svc/api 3000:3000

# Forward database
kubectl port-forward -n opengrade svc/postgres 5432:5432

# Forward MinIO
kubectl port-forward -n opengrade svc/minio 9000:9000
```

### Execute Commands in Pod

```bash
# Run prisma migrations
kubectl exec -it api-0 -n opengrade -- npm run prisma:migrate

# Check environment variables
kubectl exec api-0 -n opengrade -- env | grep DATABASE_URL

# Run one-off jobs
kubectl run -it --rm --image=node:20 --restart=Never job-runner -- npm run seed
```

## Scaling Guide

### Horizontal Pod Autoscaling (HPA)

HPA automatically scales pods based on CPU and memory usage:

```yaml
# Default HPA configuration (from values-prod.yaml)
hpa:
  api:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80

  web:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 75
```

Check HPA status:
```bash
kubectl get hpa -n opengrade
kubectl describe hpa api -n opengrade
```

### Manual Scaling

```bash
# Scale API to specific replica count
kubectl scale deployment/api --replicas=5 -n opengrade

# Scale all deployments
kubectl scale deployment --all --replicas=3 -n opengrade
```

### Pod Distribution

Pods are distributed across nodes using:
- `podAntiAffinity: preferred` - Spreads pods across nodes
- `topologySpreadConstraints` - Even distribution across zones

## Monitoring Integration

### Prometheus

Built-in Prometheus scraping endpoints:

```bash
# Check metrics endpoint
kubectl exec api-0 -n opengrade -- curl localhost:3000/metrics

# Port-forward to Prometheus
kubectl port-forward -n opengrade svc/prometheus 9090:9090
```

### Logging

Logs are collected by standard Kubernetes logging:

```bash
# View logs
kubectl logs -n opengrade -l app=api -f

# Export logs
kubectl logs -n opengrade -l app=api > api.log
```

For centralized logging, integrate with:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog
- Splunk
- CloudWatch (for EKS)
- Stackdriver (for GKE)

## High Availability

### Multi-Zone Deployment

```bash
# Deploy across 3 availability zones
# Set nodeSelector or topologySpreadConstraints in values
nodeSelector:
  topology.kubernetes.io/zone: us-east-1a
```

### Pod Disruption Budgets

Prevents too many pods from being disrupted during cluster updates:

```bash
kubectl get pdb -n opengrade
```

### StatefulSet Considerations

- PostgreSQL: Single pod (but with persistent volume)
- MinIO: Single pod (expandable to 4+ for distributed mode)
- Redis: Single pod with RDB persistence
- Keycloak: 2 pods with shared database

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod api-0 -n opengrade

# Check events
kubectl get events -n opengrade --sort-by='.lastTimestamp'

# Check resource availability
kubectl top nodes
kubectl describe node <node-name>
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm --image=postgres:16-alpine --restart=Never -- \
  psql -h postgres.opengrade.svc.cluster.local -U opengrade -d opengrade -c "SELECT 1;"
```

### Service Discovery

```bash
# Test DNS resolution
kubectl run -it --rm --image=alpine --restart=Never -- \
  nslookup postgres.opengrade.svc.cluster.local

# Test service connectivity
kubectl exec -it api-0 -n opengrade -- \
  curl -v http://postgres:5432
```

## Security Considerations

1. **Secrets Management**: Sealed Secrets or External Secrets Operator recommended
2. **Network Policies**: Default deny + explicit allow rules
3. **RBAC**: Service accounts with minimal permissions
4. **Pod Security Policy**: PSP or Pod Security Standards enforced
5. **Image Scanning**: Scan container images for vulnerabilities
6. **TLS/mTLS**: Istio service mesh optional for advanced networking

## Backup and Recovery

### Database Backups

Automated backups are configured via CronJob:

```bash
# View backup jobs
kubectl get cronjob -n opengrade

# View recent backups
kubectl get jobs -n opengrade | grep backup

# View backup logs
kubectl logs -n opengrade -l app=backup-db
```

### Disaster Recovery

```bash
# Backup all resources
kubectl get all -o yaml -n opengrade > backup.yaml

# Export secrets (CAUTION: Contains credentials)
kubectl get secret -o yaml -n opengrade > secrets.yaml

# Restore from backup
kubectl apply -f backup.yaml
kubectl apply -f secrets.yaml
```

## Cost Optimization

- Use resource requests and limits appropriately
- Enable HPA to scale down during off-peak hours
- Use spot instances for non-critical workloads
- Implement PodDisruptionBudgets for graceful evictions
- Monitor resource usage with metrics

## Next Steps

1. Review [Helm values](./helm/values.yaml) for your environment
2. Create environment-specific values files
3. Set up secrets management
4. Configure ingress and TLS certificates
5. Set up monitoring and logging
6. Configure backups and disaster recovery
7. Test deployment in staging environment
8. Deploy to production
9. Monitor and iterate

For detailed deployment instructions, see [../deployment/kubernetes.md](../deployment/kubernetes.md)
