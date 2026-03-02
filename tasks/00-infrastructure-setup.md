# Phase 0 — Infrastructure & Project Setup

> **Duration estimate**: Week 0 (pre-Phase 1 setup sprint)
> **Dependencies**: None — this is the foundation everything else builds on
> **Deliverable**: Running monorepo with all infrastructure services, CI/CD, and empty module scaffolds

---

## 0.1 Monorepo Initialization

### Task 0.1.1 — Initialize Turborepo Workspace
- Create root `package.json` with `workspaces: ["packages/*"]`
- Install Turborepo: `turbo.json` with `pipeline` config for `build`, `test`, `lint`, `dev`
- Configure shared ESLint + Prettier config at root
- Configure shared `tsconfig.base.json` with strict mode, path aliases
- **Quality gate**: `turbo run build` succeeds with empty packages
- **Test**: Workspace resolution works (`packages/api` can import from `packages/shared`)

### Task 0.1.2 — Create `packages/shared` Library
- Initialize TypeScript library package
- Create directory structure: `src/dto/`, `src/fhir-types/`, `src/enums/`, `src/grade/`
- Export shared enums mirroring Prisma enums:
  - `OrgRole`, `GuidelineType`, `GuidelineStatus`, `GuidelineRole`
  - `StudyType`, `OutcomeType`, `OutcomeState`, `EffectMeasure`
  - `CertaintyLevel`, `GradeRating`, `UpgradeRating`
  - `CodeSystem`, `PicoElement`, `ImportSource`
  - `RecommendationStrength`, `RecommendationType`, `RecStatus`
  - `EtdMode`, `VersionType`, `ConflictLevel`
  - `PollType`, `CommentStatus`, `TaskStatus`
  - `EmrElementType`, `PicoDisplay`, `EtdFactorType` (13 values)
  - `PracticalIssueCategory` (16 values)
- Create placeholder DTOs for Phase 1 entities (Guideline, Section, Reference, Recommendation)
- **Quality gate**: Package compiles, enums are importable from both `packages/api` and `packages/web`

### Task 0.1.3 — Create `packages/api` NestJS Backend Scaffold
- `npx @nestjs/cli new api --package-manager pnpm --skip-git`
- Configure NestJS 11 with TypeScript strict mode
- Install core dependencies: `@nestjs/config`, `@nestjs/passport`, `prisma`, `@prisma/client`, `pino`, `nestjs-pino`, `@nestjs/event-emitter`, `@nestjs/bull`, `class-validator`, `class-transformer`
- Create empty module directories matching architecture:
  - `src/core/` (auth, rbac, audit, config, storage, fhir-core)
  - `src/guideline-authoring/`
  - `src/reference-management/`
  - `src/grade-evidence/`
  - `src/recommendation-etd/`
  - `src/clinical-integration/`
  - `src/publishing/`
  - `src/collaboration/`
  - `src/fhir-facade/`
  - `src/worker/`
- Register all modules in `AppModule`
- Configure Pino structured logging (debug level for dev)
- **Quality gate**: `pnpm run start:dev` starts without errors
- **Test**: Health check endpoint `GET /api/health` returns 200

### Task 0.1.4 — Create `packages/web` React Frontend Scaffold
- `pnpm create vite web --template react-ts`
- Install core dependencies:
  - `@tanstack/react-router`, `@tanstack/react-query`
  - `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`
  - `tailwindcss@4`, `@shadcn/ui`, `lucide-react`
  - `axios`, `date-fns`
- Configure Tailwind CSS 4 with design tokens (primary, secondary, accent colors)
- Configure TanStack Router with file-based routes
- Configure TanStack Query provider with defaults
- Create placeholder route files:
  - `routes/__root.tsx`, `routes/index.tsx`
  - `routes/guidelines/$guidelineId/` (placeholder)
  - `routes/org/$orgId.tsx` (placeholder)
  - `routes/public/$shortName.tsx` (placeholder)
- Install and configure shadcn/ui components (Button, Dialog, Input, Select, etc.)
- **Quality gate**: `pnpm run dev` serves the app, hot reload works
- **Test**: Root route renders a placeholder dashboard

### Task 0.1.5 — Create `packages/widget` Preact Scaffold
- Initialize Preact project with Vite in library mode
- Create placeholder components: `RecommendationWidget.tsx`, `PicoWidget.tsx`, `DecisionAidWidget.tsx`
- Configure Vite for library build (target: `<50KB` gzipped)
- **Quality gate**: `pnpm run build` produces a UMD bundle

---

## 0.2 Database & Prisma Setup

### Task 0.2.1 — Create Prisma Schema (Full)
- Create `packages/api/prisma/schema.prisma` with the complete schema from the architecture spec
- Define all 32+ models:
  - **Core**: Organization, User, OrganizationMember
  - **Guideline Authoring**: Guideline, Section
  - **Reference Management**: Reference, ReferenceAttachment
  - **GRADE Evidence**: Pico, Outcome, PicoCode, PracticalIssue
  - **Recommendation & EtD**: Recommendation, EtdFactor, EtdJudgment
  - **Clinical Integration**: EmrElement
  - **Publishing**: GuidelineVersion, VersionPermission
  - **Collaboration**: GuidelinePermission, ActivityLogEntry, CoiRecord, CoiInterventionConflict, CoiDocument, Milestone, ChecklistItem, Poll, PollVote, FeedbackComment, Task, Subscriber, InternalDocument
  - **Join tables**: SectionReference, SectionPico, SectionRecommendation, PicoRecommendation, OutcomeReference, RecommendationTag
  - **Tags**: Tag
- Define all 27 enums (exact values from spec)
- Configure PostgreSQL provider with UUID defaults
- **Quality gate**: `npx prisma validate` passes
- **Test**: `npx prisma format` produces clean output

### Task 0.2.2 — Create Custom SQL Indexes
- Create Prisma migration with additional indexes:
  - Full-text GIN index on Reference (title + authors + abstract)
  - pg_trgm GIN index on Reference.title for fuzzy deduplication
  - Composite index on ActivityLogEntry (guideline_id, timestamp DESC) INCLUDE (action_type, entity_type, user_id)
  - Index on PicoCode (code_system, code)
  - Index on GuidelineVersion (guideline_id, published_at DESC)
- Create `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in migration
- **Quality gate**: Migration applies cleanly to a fresh PostgreSQL 16 instance
- **Test**: `EXPLAIN ANALYZE` on sample queries uses the expected indexes

### Task 0.2.3 — Prisma Client Generation & Soft-Delete Middleware
- Configure Prisma client generation with `output` path
- Implement Prisma middleware that auto-filters `isDeleted = false` on all `findMany`, `findFirst`, `findUnique` queries unless explicitly overridden (e.g., `{ where: { isDeleted: undefined } }`)
- Create `PrismaService` extending `PrismaClient` with `$on('beforeExit')` cleanup
- Register `PrismaService` as global provider in CoreModule
- **Quality gate**: Soft-delete middleware intercepts queries correctly
- **Test**: Unit test — create record, soft-delete it, verify `findMany` excludes it, verify explicit override includes it

### Task 0.2.4 — Database Seeding Script
- Create `prisma/seed.ts` with:
  - A sample Organization
  - 2 sample Users (admin, author)
  - An OrganizationMember linking admin to org
  - A sample Guideline with 3 Sections (nested)
  - 2 sample References
  - 1 sample PICO with 2 Outcomes
  - 1 sample Recommendation
- **Quality gate**: `npx prisma db seed` runs without errors on fresh database
- **Test**: Verify seeded data via `prisma studio`

---

## 0.3 Infrastructure Services (Docker Compose)

### Task 0.3.1 — Create Docker Compose Configuration
- Create `docker-compose.yml` with all services:
  - `db`: postgres:16-alpine, port 5432, persistent volume `pgdata`
  - `keycloak`: quay.io/keycloak/keycloak:24.0, start-dev mode, port 8080, PostgreSQL backend
  - `minio`: MinIO S3-compatible storage, ports 9000 (API) + 9001 (console), persistent volume `miniodata`
  - `redis`: redis:7-alpine, port 6379
  - `api`: NestJS backend, port 3000, depends_on all infra
  - `web`: React frontend (nginx), port 5173
  - `worker`: Same NestJS build, `WORKER_MODE=true`, runs `node dist/worker.js`
- Create `.env.example` with all environment variables
- Create `docker-compose.prod.yml` override for production settings
- **Quality gate**: `docker compose up -d` starts all services, all health checks pass
- **Test**: Can connect to PostgreSQL, Redis, MinIO, and Keycloak from the API container

### Task 0.3.2 — Keycloak Realm Configuration
- Create Keycloak realm configuration JSON (`opengrade-realm.json`):
  - Realm: `opengrade`
  - Client: `opengrade-api` (confidential, service-accounts-enabled)
  - Client: `opengrade-web` (public, PKCE-enabled)
  - Default roles: `user`
  - Required user actions: verify-email
  - Login settings: registration enabled, email as username
- Create import script that applies realm config on first startup
- **Quality gate**: Keycloak admin console shows the configured realm
- **Test**: Can obtain an access token via OIDC flow from `opengrade-web` client

### Task 0.3.3 — MinIO Bucket Setup
- Create initialization script that:
  - Creates bucket `opengrade-files` with private ACL
  - Creates sub-prefixes: `reference-attachments/`, `forest-plots/`, `coi-documents/`, `internal-docs/`, `cover-pages/`, `pdf-snapshots/`, `json-exports/`
  - Sets lifecycle rules (if needed)
- **Quality gate**: MinIO console shows bucket with correct structure
- **Test**: Can upload and download a test file via the S3 API from the NestJS app

---

## 0.4 Core Module (`@app/core`)

### Task 0.4.1 — AuthModule (Keycloak OIDC Guard)
- Install `@nestjs/passport`, `passport`, `passport-jwt`, `jwks-rsa`
- Create `JwtStrategy` that validates Keycloak-issued JWTs using JWKS endpoint
- Create `@Public()` decorator for unauthenticated routes (health check, FHIR metadata)
- Create `AuthGuard` applied globally via `APP_GUARD`
- Extract user claims (keycloakId, email, roles) into `request.user`
- Create `CurrentUser` decorator for controller parameter injection
- Implement user auto-provisioning: on first authenticated request, create User record if keycloakId not found in DB
- **Quality gate**: Unauthenticated requests to protected endpoints return 401
- **Test**: Unit test — valid JWT passes guard; expired JWT returns 401; malformed JWT returns 401
- **E2E test**: Login via Keycloak, access protected endpoint, verify user auto-provisioned in DB

### Task 0.4.2 — RbacModule (Permission Checks)
- Create `@Roles('ADMIN', 'AUTHOR')` decorator for controller methods
- Create `RbacGuard` that:
  - Reads `@Roles()` metadata from handler
  - Resolves `guidelineId` from route params (`req.params.guidelineId` or `req.params.id`) or request body
  - Queries `GuidelinePermission` table for current user + guideline
  - Checks if user's role is in the allowed roles list
  - Organization admins bypass guideline-level checks (query `OrganizationMember` where role = ADMIN and org matches guideline's org)
- Handle edge cases: no guidelineId (org-level routes), personal guidelines (creator is always admin)
- **Quality gate**: Admin can access admin-only endpoints; Author cannot; Viewer gets 403
- **Test**: Unit tests for each role permutation; integration test with seeded permissions

### Task 0.4.3 — AuditModule (Activity Log Interceptor)
- Create `AuditInterceptor` (global `APP_INTERCEPTOR`):
  - Captures: HTTP method, route, user, response status
  - Only fires for POST/PUT/PATCH/DELETE (not GET)
  - Extracts `entityType` from route path (e.g., `/api/recommendations/:id` → `RECOMMENDATION`)
  - Extracts `entityId` from route params
  - Stores `changeDetails` as JSON diff (new request body vs. previous state from DB)
  - Creates `ActivityLogEntry` record asynchronously (non-blocking)
- Create `AuditService` with methods for querying activity logs (paginated, filterable by guideline, user, entity type, date range)
- **Quality gate**: Every mutation endpoint automatically generates an activity log entry
- **Test**: Create a recommendation, verify ActivityLogEntry exists with correct entityType, entityId, actionType, changeDetails

### Task 0.4.4 — ConfigModule (Environment & Feature Flags)
- Configure `@nestjs/config` with validation via Zod:
  - `DATABASE_URL`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`
  - `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
  - `REDIS_URL`
  - `WORKER_MODE` (boolean)
  - `LOG_LEVEL` (debug/info/warn)
- Fail fast on missing required env vars
- **Quality gate**: App refuses to start with missing required env vars
- **Test**: Unit test — valid config loads; missing var throws descriptive error

### Task 0.4.5 — StorageModule (S3 Abstraction)
- Install `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- Create `StorageService` with methods:
  - `upload(key: string, buffer: Buffer, mimeType: string): Promise<string>` — returns S3 key
  - `download(key: string): Promise<Buffer>`
  - `getSignedUrl(key: string, expiresIn?: number): Promise<string>` — pre-signed download URL
  - `delete(key: string): Promise<void>`
- Configure with MinIO endpoint for dev, AWS S3 for production (via ConfigModule)
- **Quality gate**: Can upload/download/delete files via StorageService
- **Test**: Integration test — upload a test file, download it, verify contents match, delete it, verify 404

### Task 0.4.6 — FhirCoreModule (Base Serialization Utilities)
- Create FHIR R5 base types (or generate from FHIR R5 StructureDefinitions):
  - `Resource`, `DomainResource`, `Bundle`, `Meta`, `Narrative`, `Extension`, `CodeableConcept`, `Reference`, `Identifier`
  - Resource-specific types: `Composition`, `PlanDefinition`, `Evidence`, `EvidenceVariable`, `Citation`, `ArtifactAssessment`, `Organization`, `Practitioner`, `Provenance`, `AuditEvent`
- Create utility functions:
  - `buildMeta(entity): Meta` — assembles FHIR Meta from entity fhirMeta JSON
  - `buildNarrative(tiptapJson): Narrative` — converts TipTap JSON to FHIR Narrative (XHTML)
  - `buildCodeableConcept(system, code, display): CodeableConcept`
  - `buildReference(resourceType, id): FhirReference`
- **Quality gate**: Generated types match FHIR R5 spec structure
- **Test**: Unit test — `buildMeta` produces valid FHIR Meta JSON; `buildNarrative` converts sample TipTap doc

### Task 0.4.7 — SoftDeleteInterceptor
- Create `SoftDeleteInterceptor` that:
  - Intercepts DELETE requests on entity routes
  - Converts to `UPDATE ... SET isDeleted = true` instead of actual DELETE
  - Emits `entity.soft-deleted` event with entity type and ID
  - Returns 200 (not 204) with the soft-deleted entity
- Apply to all entity controllers via module-level interceptor
- **Quality gate**: DELETE requests set `isDeleted = true` without removing records
- **Test**: Delete a Section, verify record still exists with `isDeleted = true`, verify it's excluded from normal queries

---

## 0.5 CI/CD & Developer Experience

### Task 0.5.1 — Dockerfiles
- Create `packages/api/Dockerfile` (multi-stage: build + production)
- Create `packages/web/Dockerfile` (multi-stage: build + nginx)
- Create `packages/widget/Dockerfile` (build + nginx CDN)
- Optimize for layer caching (copy package.json first, then source)
- **Quality gate**: All images build successfully, total size < 500MB combined

### Task 0.5.2 — Development Scripts
- Add root `package.json` scripts:
  - `dev` — starts API + Web + Worker in parallel (via Turborepo)
  - `db:migrate` — runs Prisma migrations
  - `db:seed` — runs seed script
  - `db:studio` — opens Prisma Studio
  - `test` — runs all tests
  - `lint` — runs ESLint across all packages
  - `typecheck` — runs `tsc --noEmit` across all packages
- **Quality gate**: All scripts work from the repo root

### Task 0.5.3 — API Documentation Setup
- Install `@nestjs/swagger`
- Configure Swagger/OpenAPI 3.1 document generation at `/api/docs`
- Add `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators to the health check endpoint as a template
- **Quality gate**: Swagger UI accessible at `http://localhost:3000/api/docs`

---

## Phase 0 Summary

| Category | Count |
|----------|-------|
| Tasks | 21 |
| Models defined | 32+ |
| Enums defined | 27 |
| Docker services | 7 |
| NestJS modules scaffolded | 9 |
| Frontend routes scaffolded | 7 |
