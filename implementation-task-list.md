# OpenGRADE Implementation Task List (Derived from Architecture Docs)

Source docs:
- `opengrade-architecture.md`
- `compass_artifact_wf-ac90d96b-1eee-4206-9b48-09594f3da2b5_text_markdown.md` (MAGICapp reverse-engineering technical specification artifact)

## Phase 0 — Platform Foundation (Arch §1, §3, §4, §7)
- [x] Create monorepo skeleton aligned to planned structure (`apps/api`, `apps/web`, `packages/fhir`, `packages/ui`, `infra`).
- [x] Set up NestJS 11 backend baseline with strict TypeScript, linting, formatting, and OpenAPI generation.
- [x] Set up React 19 + Vite frontend baseline with routing, query client, and shared UI primitives.
- [x] Provision local dev stack with Docker Compose (PostgreSQL, Keycloak, MinIO for object storage, API, web).
- [x] Add environment configuration strategy (`.env.example`, validation, per-service config).
- [x] Implement baseline auth handshake (OIDC login, token verification, current-user endpoint).
- [x] Implement organization-level multi-tenant context resolution for every request.
- [x] Add structured logging baseline and request correlation IDs.

## Phase 1 — FHIR-Native Data Model & Persistence (Arch §2, §3)
- [x] Define Prisma schema for core entities: Organization, User, OrganizationMember, Guideline, GuidelineVersion.
- [x] Define Prisma schema for content entities: Section, Recommendation, Pico, Outcome, Reference.
- [x] Define Prisma schema for governance entities: GuidelinePermission, ActivityLogEntry, CoiRecord.
- [x] Add FHIR-native columns (`fhir_resource_type`, `fhir_meta`, `fhir_extensions`) to mapped entities.
- [x] Add soft-delete and hidden flags consistently (`is_deleted`, `is_hidden`) where required.
- [x] Add audit columns and relation fields (`created_by`, `updated_by`, timestamps).
- [ ] Implement migration set for all core tables with referential integrity.
- [x] Add indexes identified in architecture (status, foreign-key traversal, date and lookup paths).
- [x] Seed initial roles, default enums, and one sample organization.

## Phase 2 — API Module Skeleton & Core CRUD (Arch §4, §6.1)
- [x] Implement NestJS module boundaries: auth, organizations, guidelines, sections, recommendations, pico, outcomes, references.
- [x] Add DTO validation and response serialization strategy.
- [x] Implement CRUD APIs for Organization and Guideline with permission checks.
- [x] Implement CRUD APIs for Section with tree-aware parent/child operations.
- [x] Implement CRUD APIs for Recommendation, Pico, Outcome, Reference.
- [x] Add link-table APIs for section↔reference, section↔pico, section↔recommendation.
- [x] Add recommendation↔pico and outcome↔reference linking APIs.
- [x] Implement consistent pagination, filtering, and sort contracts across list endpoints.
- [x] Publish initial OpenAPI 3.1 spec for all implemented endpoints.

## Phase 3 — Authoring UX & Rich Text (Arch §5.2, §5.3, §5.4, §9.2)
- [x] Build application shell (left nav, top bar, context breadcrumbs, guideline selector).
- [x] Build guideline workspace screen with section tree and detail panel.
- [x] Integrate TipTap editor for section/recommendation narrative fields.
- [x] Implement section drag-and-drop reorder with stable persisted ordering.
- [x] Implement section auto-numbering and `exclude_from_numbering` behavior.
- [x] Add reference management UI (create/edit/search/link/unlink).
- [x] Add PICO builder UI and code-entry tabs.
- [x] Add outcome management UI with grouped ordering and state badges.
- [x] Add recommendation cards with rationale/practical information blocks.

## Phase 4 — Evidence Engine (GRADE + EtD) (Arch §3.1, §5.3, §8, §9)
- [x] Implement outcome evidence fields (effect measures, CI bounds, participant counts).
- [x] Implement GRADE certainty model and downgrade/upgrade factor persistence.
- [x] Build GRADE assessment UI (risk of bias, inconsistency, indirectness, imprecision, publication bias, upgrades).
- [x] Implement plain-language summary field for each outcome.
- [x] Implement EtD models for 4-factor, 7-factor, and 12-factor modes.
- [x] Build EtD UI grids with per-intervention judgments and color labels.
- [x] Implement mode switching without data loss (hidden-but-preserved factors).
- [ ] Implement shadow outcome workflow for evidence updates.
- [ ] Add RevMan (`.rm5`) parsing/import pipeline and outcome matching controls (RevMan = Cochrane Review Manager format).

## Phase 5 — Workflow, Versioning, and Publishing (Arch §3.1, §5, §9.4)
- [ ] Implement recommendation and guideline state machine transitions.
- [ ] Implement publish actions (minor/major) and version comment capture.
- [ ] Auto-create next draft after publish and mark prior versions as out-of-date.
- [ ] Separate publishing from public visibility toggle with guardrails.
- [ ] Implement permalink strategy (`shortName`, latest public, explicit version URL).
- [ ] Generate and store immutable version snapshot bundles.
- [ ] Add version history UI with compare and navigation affordances.
- [ ] Enforce edit redirection from historic version to active draft.

## Phase 6 — Collaboration, Permissions, and Governance (Arch §4.2, §6, §9.3)
- [ ] Implement full RBAC matrix (organization roles + guideline roles).
- [ ] Implement activity logging interceptor for create/update/delete/publish flows.
- [ ] Build activity log screen with user/action/entity/date filters.
- [ ] Implement undo/recover flows for soft-deleted content.
- [ ] Implement track changes model and rendering in rich-text fields.
- [ ] Add accept/reject tracked changes workflow with role checks.
- [ ] Implement threaded comments and status workflow (open/resolved/deprecated).
- [ ] Implement COI matrix storage and intervention/member conflict views.
- [ ] Add voting exclusion logic linked to COI declarations.

## Phase 7 — Interoperability & Clinical Integration (Arch §2, §6.2, §9.5, §14)
- [ ] Implement internal projection layer from domain models to FHIR resources.
- [ ] Implement FHIR mappings for Organization, Composition, PlanDefinition, Evidence, EvidenceVariable, Citation.
- [ ] Implement read-only `/fhir/*` facade endpoints with core search params.
- [ ] Implement guideline version snapshot as FHIR Bundle document export.
- [ ] Add ETag/Last-Modified support for FHIR read operations.
- [ ] Implement terminology lookup integration (SNOMED CT, ICD-10, ATC, RxNorm).
- [ ] Implement EMR element modeling on recommendations.
- [ ] Build clinical codes API for downstream EHR consumption.
- [ ] Validate produced resources against selected CPG-on-FHIR and EBM-on-FHIR profiles.

## Phase 8 — Export, Distribution, and Decision Aids (Arch §5.3, §9, compass §9, §13)
- [ ] Implement async PDF generation pipeline with template customization options.
- [ ] Implement DOCX export with parity to PDF structure.
- [ ] Implement full JSON exports for guideline and key sub-resources.
- [ ] Store export artifacts by version in object storage and expose download endpoints.
- [ ] Implement decision aid generation from linked PICOs/outcomes.
- [ ] Build layered decision aid UI (overview, pictograph, full evidence).
- [ ] Implement embeddable decision-aid widget URLs and config parameters.
- [ ] Add adaptation/portability pack export-import workflow.
- [ ] Add multilingual content and UI support for the documented language set.

## Phase 9 — Quality, Security, and Operations (Arch §7, §10)
- [ ] Create unit/integration/E2E test suites for critical authoring and publish flows.
- [ ] Add schema/data validation checks for orphan links and missing evidence metadata.
- [ ] Add performance tests for large guideline trees and export jobs.
- [ ] Add API rate limiting, secure file upload validation, and input sanitization checks.
- [ ] Add backup/restore jobs for PostgreSQL and object storage.
- [ ] Add runtime dashboards for API latency, job queue health, and error rates.
- [ ] Add deployment runbooks for Docker Compose and Kubernetes targets.
- [ ] Add incident response and disaster recovery checklists.

## Cross-Cutting Definition of Done (all phases)
- [ ] Every module has architecture decision notes and sequence diagrams where behavior is non-trivial.
- [ ] Every endpoint includes OpenAPI examples and permission requirements.
- [ ] Every user-visible workflow includes audit-log coverage.
- [ ] Every publish/export path is idempotent and retry-safe.
- [ ] Every FHIR transform has fixture-based conformance tests.
- [ ] Every release includes migration verification and rollback instructions.
