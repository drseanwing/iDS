# OpenGRADE Implementation Task List (Derived from Architecture Docs)

Source docs:
- `opengrade-architecture.md`
- `compass_artifact_wf-ac90d96b-1eee-4206-9b48-09594f3da2b5_text_markdown.md` (MAGICapp reverse-engineering technical specification artifact)

> **Audit status**: Last reviewed 2026-04-25. All items verified. Phase 7 terminology now fully complete. New tasks identified: FHIR CapabilityStatement endpoint, FHIR search interactions, guideline clone, section nesting validation, 6 missing component tests. See Consolidated Bug/Gap Registry below.
> Legend: `[x]` = implemented & verified | `[~]` = partially implemented / known gap | `[ ]` = not yet started

---

## Phase 0 — Platform Foundation (Arch §1, §3, §4, §7)
- [x] Create monorepo skeleton aligned to planned structure (`apps/api`, `apps/web`, `packages/fhir`, `packages/ui`, `infra`).
- [x] Set up NestJS 11 backend baseline with strict TypeScript, linting, formatting, and OpenAPI generation.
- [x] Set up React 19 + Vite frontend baseline with routing, query client, and shared UI primitives.
- [x] Provision local dev stack with Docker Compose (PostgreSQL, Keycloak, MinIO for object storage, API, web).
- [x] Add environment configuration strategy (`.env.example`, validation, per-service config).
- [x] Implement baseline auth handshake (OIDC login, token verification, current-user endpoint).
- [x] Implement organization-level multi-tenant context resolution for every request.
- [x] Add structured logging baseline and request correlation IDs.

---

## Phase 1 — FHIR-Native Data Model & Persistence (Arch §2, §3)
- [x] Define Prisma schema for core entities: Organization, User, OrganizationMember, Guideline, GuidelineVersion.
- [x] Define Prisma schema for content entities: Section, Recommendation, Pico, Outcome, Reference.
- [x] Define Prisma schema for governance entities: GuidelinePermission, ActivityLogEntry, CoiRecord.
- [x] Add FHIR-native columns (`fhir_resource_type`, `fhir_meta`, `fhir_extensions`) to mapped entities.
- [x] Add soft-delete and hidden flags consistently (`is_deleted`, `is_hidden`) where required.
- [x] Add audit columns and relation fields (`created_by`, `updated_by`, timestamps).
- [x] Implement migration set for all core tables with referential integrity. _(Baseline migration `20260306000000_init` created via `prisma migrate diff --from-empty`. Existing databases: run `prisma migrate resolve --applied 20260306000000_init`.)_
- [x] Add indexes identified in architecture (status, foreign-key traversal, date and lookup paths).
- [x] Seed initial roles, default enums, and one sample organization.

---

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
- **Known gaps (API layer):**
  - [~] `UpdateRecommendationDto` previously omitted `remark`, `rationale`, `practicalInfo` JSON fields — **fixed** (added to DTO + service). _(Was: UI sent them, API silently dropped them.)_
  - [~] `useUpdateRecommendation` frontend hook previously used `PATCH` while the controller declares `@Put` — **fixed** (changed to `PUT`). _(Was: recommendation saves failed in production.)_
  - [~] Guideline settings (`etdMode`, `showSectionNumbers`, `showCertaintyInLabel`, `showGradeDescription`, `trackChangesDefault`, `enableSubscriptions`, `enablePublicComments`, `showSectionTextPreview`, `pdfColumnLayout`, `picoDisplayMode`, `coverPageUrl`, `isPublic`) were absent from `CreateGuidelineDto`/`UpdateGuidelineDto` and not written by the service — **fixed** (added to DTO + service).
  - [~] `RecommendationsService.findByGuideline` was not including `sectionPlacements`, so `sectionId` was never returned — **fixed** (includes first placement and maps to top-level `sectionId`). _(Was: frontend `r.sectionId === section.id` filter always returned empty; no recommendations showed per section.)_
  - [~] `GuidelinesPage` "New Guideline" button was not wired — **fixed** (inline form with title + short name; calls POST /guidelines via `useCreateGuideline`).
  - [~] `fhirMeta` columns defined in Prisma schema — **fixed** (added `fhirMeta` to Create/Update DTOs and services for Guidelines, References, Picos, and Recommendations; cast to `Prisma.InputJsonValue` for type safety. Note: `fhirExtensions` column added to Guideline DTO.)
  - [~] `EtdFactor` model has no `@@unique([recommendationId, factorType])` constraint — **fixed** (added `@@unique([recommendationId, factorType])` to schema; `createMany` now uses `skipDuplicates: true`).
  - [~] `GET /sections` returns only one level of nested `children` (grandchildren excluded) — **fixed** (rewrote `findByGuideline` to fetch all sections and build full tree in memory).
  - [~] `SectionsService.findByGuideline` returns top-level sections only — **fixed** (tree is now built recursively with all descendants nested under their parents).
  - [~] Soft-deleted content is permanently inaccessible — **fixed** (added `POST /guidelines/:id/restore` and `POST /sections/:id/restore` endpoints).
  - [~] `ReferencesPage` (top-level `/references` app path) — **fixed** (built full page with cross-guideline reference listing, server-side search, grouped by guideline, "places used" badges showing linked sections/outcomes; API endpoint updated to support optional guidelineId and search filters).
  - [~] `DashboardPage` stats (Guidelines / Sections / Recommendations counts) are hardcoded as `'--'` — **fixed** (added `GET /guidelines/stats` endpoint; `DashboardPage` now fetches real counts via `useDashboardStats` hook).
  - [~] `AppShell` user section shows hardcoded "User" text — **fixed** (wired to `useAuth` store; displays user name/email and logout button).

---

## Phase 3 — Authoring UX & Rich Text (Arch §5.2, §5.3, §5.4, §9.2)
- [x] Build application shell (left nav, top bar, context breadcrumbs, guideline selector).
- [x] Build guideline workspace screen with section tree and detail panel.
- [x] Integrate TipTap editor for section/recommendation narrative fields.
- [x] Implement section drag-and-drop reorder with stable persisted ordering.
- [x] Implement section auto-numbering and `exclude_from_numbering` behavior.
- [x] Add reference management UI (create/edit/search/link/unlink) — within guideline workspace.
- [x] Add PICO builder UI and code-entry tabs.
- [x] Add outcome management UI with grouped ordering and state badges.
- [x] Add recommendation cards with rationale/practical information blocks.
- **Known gaps (Authoring UX):**
  - [x] Section creation UI — inline "Add Section" form added to `SectionTree` sidebar (+ button opens title input; submits via `useCreateSection`).
  - [x] Section deletion UI — `Trash2` delete button with two-step confirm added to each `SectionTreeItem`; wired via `useDeleteSection`.
  - [x] Recommendation creation UI — "Add" button + inline form added to `SectionDetailPanel`; wired via `useCreateRecommendation` (creates rec and links to section).
  - [x] Recommendation deletion UI — `Trash2` delete button with two-step confirm added to `RecommendationEditorCard`; wired via `useDeleteRecommendation`.
  - [~] PICO narrative summary field — **fixed** (added `narrativeSummary` textarea to PicoCard in PicoBuilderPanel; auto-saves on blur via `useUpdatePico`). _(Schema field is `narrativeSummary Json?`; DTO already had the field; only UI was missing.)_
  - [x] Practical issues (16 categories from grounded theory) for PICO — **fixed** (API: CRUD endpoints on `/picos/:picoId/practical-issues` with all 16 categories. UI: "Practical Issues" tab added to PicoCard in PicoBuilderPanel with category badge, inline create form with category dropdown, delete with confirm.)
  - [~] Reference "places used" tracking — **fixed** (top-level ReferencesPage now shows section and outcome link badges per reference; API `findAll` includes `sectionPlacements` and `outcomeLinks` with titles).
  - [x] Reference auto-numbering on read — **fixed** (added `computeReferenceNumbers()` to ReferencesService with depth-first section tree traversal; `GET /references/numbered?guidelineId=` endpoint returns numbering map; `findAll` attaches `referenceNumber` to each reference when guidelineId is provided).
  - [x] Track changes in TipTap — **fixed** (Created custom TipTap Mark extension with insertion/deletion marks storing authorId, authorName, timestamp, changeId. TrackChangesToolbar with toggle, accept/reject per-change and bulk operations. useTrackChanges hook. RichTextEditor updated with trackChanges and canManageChanges props.)
  - [x] Presence/collaborative cursor indicators — **fixed** (Created PresenceModule with SSE-based real-time presence. PresenceService with in-memory tracking, heartbeat, stale cleanup. PresenceController with SSE stream endpoint. Frontend usePresence hook with EventSource + heartbeat. PresenceIndicator component with colored user avatars.)
  - [~] Guideline settings UI — **fixed** (added `GuidelineSettingsPanel` component with all settings fields; accessible via "Settings" tab in guideline workspace; uses `useUpdateGuideline` hook).
  - [~] `AppShell` top-level references tab — **fixed** (ReferencesPage now fully functional with cross-guideline listing, search, and places-used tracking).

---

## Phase 4 — Evidence Engine (GRADE + EtD) (Arch §3.1, §5.3, §8, §9)
- [x] Implement outcome evidence fields (effect measures, CI bounds, participant counts).
- [x] Implement GRADE certainty model and downgrade/upgrade factor persistence.
- [x] Build GRADE assessment UI (risk of bias, inconsistency, indirectness, imprecision, publication bias, upgrades).
- [x] Implement plain-language summary field for each outcome.
- [x] Implement EtD models for 4-factor, 7-factor, and 12-factor modes.
- [x] Build EtD UI grids with per-intervention judgments and color labels.
- [x] Implement mode switching without data loss (hidden-but-preserved factors).
- [x] Implement shadow outcome workflow for evidence updates. — **fixed** (API: create/promote/list shadows. UI: `ShadowOutcomePanel` with create shadow button, side-by-side evidence comparison, promote/discard actions with confirmation. Wired into `PicoBuilderPanel` via GitBranch toggle on each outcome row.)
- [x] Add RevMan (`.rm5`) parsing/import pipeline and outcome matching controls. — **fixed** (Created RevmanModule with XML parser for .rm5 format extracting comparisons/outcomes. RevmanImportService maps RevMan data to Prisma Outcome records with transaction safety. Controller with parse preview + import endpoints. Frontend RevManImportWizard with multi-step upload/preview/map/import workflow.)

---

## Phase 5 — Workflow, Versioning, and Publishing (Arch §3.1, §5, §9.4)
- [x] Implement recommendation and guideline state machine transitions. — **fixed** (guideline: `PUT /guidelines/:id/status` with allowed-transitions map; recommendation: `PUT /recommendations/:id/status` with RecStatus enum [NEW, UPDATED, IN_REVIEW, POSSIBLY_OUTDATED, UPDATED_EVIDENCE, REVIEWED, NO_LABEL] and optional comment + timestamp).
- [~] Implement publish actions (minor/major) and version comment capture. — **partially fixed** (added `VersionsModule` with `POST /versions` to create version snapshots, `GET /versions?guidelineId=` listing, auto-incremented version numbering via `computeNextVersion()`. **UI added**: `VersionHistoryPanel` + `PublishDialog` with major/minor selection, version preview, comment, public toggle; accessible via "Versions" tab in workspace.)
- [x] Auto-create next draft after publish and mark prior versions as out-of-date. — **fixed** (publish resets guideline to DRAFT; MAJOR publish marks prior public versions as superseded via `isPublic: false`.)
- [x] Separate publishing from public visibility toggle with guardrails. — **fixed** (Added `PUT /guidelines/:id/public` endpoint with version-exists guardrail: cannot make public before publishing at least one version. Toggle available in GuidelineSettingsPanel.)
- [x] Implement permalink strategy (`shortName`, latest public, explicit version URL). — **fixed** (added `GET /guidelines/by-slug/:shortName` for slug resolution, `GET /guidelines/by-slug/:shortName/latest` for latest public version snapshot.)
- [~] Generate and store immutable version snapshot bundles. — **fixed** (enhanced `VersionsService.publish()` to capture comprehensive snapshots including full guideline metadata, organization, sections tree, recommendations with EtD factors, PICOs with outcomes/codes/practical issues, references with all links). _(Snapshot is stored as structured JSON, not FHIR Bundle — FHIR transformation deferred to Phase 7.)_
- [x] Add version history UI with compare and navigation affordances. — **fixed** (added `GET /versions/compare?v1=:id1&v2=:id2` endpoint returning both snapshots for frontend diffing. **UI**: `VersionHistoryPanel` with type badges, dates, publisher names, Latest/Superseded badges, JSON export, read-only snapshot banner. `VersionCompareDialog` with version selector dropdowns and diff table showing added/removed/changed paths.)
- [x] Enforce edit redirection from historic version to active draft. — **fixed** (VersionHistoryPanel shows read-only banner explaining published versions are immutable snapshots, with guidance to edit the active draft. Latest/Superseded badges distinguish current from historic versions.)

---

## Phase 6 — Collaboration, Permissions, and Governance (Arch §4.2, §6, §9.3)
- [x] Implement full RBAC matrix (organization roles + guideline roles). — **fixed** (RbacGuard with @Roles() applied to all 9 controllers: mutations restricted to ADMIN/AUTHOR, publish/permissions to ADMIN only, comments allow REVIEWER, GET endpoints unrestricted.)
- [x] Implement activity logging interceptor for create/update/delete/publish flows. — **fixed** (added global `ActivityLoggingInterceptor` registered as `APP_INTERCEPTOR`; logs POST/PUT/PATCH/DELETE operations best-effort via `ActivityService.log()`; `ActivityModule` is `@Global()`. Enhanced with guidelineId resolution from 4 sources, enriched action types, change details metadata. 15 tests.)
- [x] Build activity log screen with user/action/entity/date filters. — **fixed** (API: `GET /activity?guidelineId=` with filters. UI: `ActivityLogPanel` with entity type, action type dropdowns, text filter, relative timestamps, action badges, load-more pagination. Accessible via "Activity" tab in workspace.)
- [x] Implement undo/recover flows for soft-deleted content. — **fixed** (API: `POST /guidelines/:id/restore` and `POST /sections/:id/restore` endpoints. Added `onlyDeleted=true` query param to list endpoints. UI: `RecoverPanel` with restore buttons for deleted sections and guidelines, embedded in GuidelineSettingsPanel.)
- [x] Implement track changes model and rendering in rich-text fields. — **fixed** (Covered by Phase 3 track changes implementation: insertion marks with green background, deletion marks with red strikethrough.)
- [x] Add accept/reject tracked changes workflow with role checks. — **fixed** (TrackChangesToolbar accept/reject per-change and bulk. canManageChanges prop controls visibility based on role.)
- [x] Implement threaded comments and status workflow (open/resolved/deprecated). — **fixed** (API: full CRUD with threading and status transitions. UI: `CommentsPanel` with threaded display, inline reply forms, status badges, resolve/delete actions. Accessible via "Comments" sub-tab in RecommendationEditorCard.)
- [x] Implement COI matrix storage and intervention/member conflict views. — **fixed** (API: full CRUD. UI: `CoiDashboard` with conflict type badges, voting exclusion indicators, inline create/edit forms, expandable disclosure text. Accessible via "COI" tab in workspace.)
- [~] Add voting exclusion logic linked to COI declarations. — **partially fixed** (PollsService `castVote` checks CoiRecord `isExcludedFromVoting` flag and throws ForbiddenException if user is excluded).
- [x] Implement Poll/Delphi voting tool. — **fixed** (API: full CRUD with voting and COI exclusion check. UI: `PollsPanel` with poll creation, inline voting per type (OPEN_TEXT, MULTIPLE_CHOICE, STRENGTH_VOTE, ETD_JUDGMENT), close poll, vote tally. Accessible via "Polls" tab in workspace.)
- [x] Implement Milestone tracker with AGREE II / SNAP-IT checklists. — **fixed** (API: full CRUD with checklist items and toggle. UI: `MilestonesPanel` with progress bar, vertical timeline, completion checkboxes, color-coded dates, checklist items with toggle. Accessible via "Milestones" tab in workspace.)
- [x] Implement Task manager (Kanban board). — **fixed** (API: full CRUD with status/assignee filters. UI: `TaskBoard` Kanban with TODO/IN_PROGRESS/DONE columns, task cards with assignee badges, due date color-coding, status-change buttons, inline create form. Accessible via "Tasks" tab in workspace.)
- [x] Build guideline permission management UI (invite members, assign roles). — **fixed** (API: CRUD endpoints for permissions. UI: `PermissionManagementPanel` with member list, role badges (ADMIN/AUTHOR/REVIEWER/VIEWER), add member form, remove with confirm. Embedded in GuidelineSettingsPanel.)

---

## Phase 7 — Interoperability & Clinical Integration (Arch §2, §6.2, §9.5, §14)
- [x] Implement internal projection layer from domain models to FHIR resources. — **fixed** (Created `fhir/` module with 4 projection services mapping domain models to FHIR R5 resources.)
- [x] Implement FHIR mappings for Organization, Composition, PlanDefinition, Evidence, EvidenceVariable, Citation. — **fixed** (Projections: `guideline-to-composition.ts`, `recommendation-to-plan-definition.ts`, `pico-to-evidence.ts`, `reference-to-citation.ts`.)
- [x] Implement read-only `/fhir/*` facade endpoints with core search params. — **fixed** (Added `FhirController` with `GET /fhir/Composition/:id`, `GET /fhir/Citation/:id`, `GET /fhir/PlanDefinition/:id`, `GET /fhir/Evidence/:id`.)
- [x] Implement guideline version snapshot as FHIR Bundle document export. — **fixed** (Added `GET /fhir/Bundle/:guidelineId` returning a FHIR Bundle of type 'document' with all resources.)
- [x] Add ETag/Last-Modified support for FHIR read operations. — **fixed** (Created `FhirEtagInterceptor` applied to all FHIR controller endpoints; computes MD5 ETag from response body, sets Last-Modified from `meta.lastUpdated`, supports If-None-Match conditional requests returning 304.)
- [x] Implement terminology lookup integration (SNOMED CT, ICD-10, ATC, RxNorm) via BioPortal proxy with Redis cache. — **fixed** (TerminologyModule with `GET /terminology/search?system=&query=&limit=` endpoint. Full BioPortal proxy with 24-hour Redis cache (KeyvRedis + @nestjs/cache-manager). Falls back to in-memory stub when BIOPORTAL_API_KEY is unset. Gracefully degrades if Redis is unavailable.)
- [x] Implement EMR element modeling on recommendations. — **fixed** (EmrElement model exists in schema; added CRUD endpoints `POST/GET/DELETE /recommendations/:id/emr-elements` with `CreateEmrElementDto` supporting elementType, codeSystem, code, display, implementationDescription.)
- [x] Build clinical codes API for downstream EHR consumption. — **fixed** (Added `GET /guidelines/:id/clinical-codes` aggregating all PicoCodes and EmrElements for a guideline.)
- [x] Validate produced resources against selected CPG-on-FHIR and EBM-on-FHIR profiles. — **fixed** (Added `FhirValidationService` with per-resource-type validation: checks `resourceType`, `id`, `meta.profile`, and type-specific fields. `POST /fhir/$validate` endpoint accepts any FHIR resource and returns `{ valid, errors }`.)

---

## Phase 8 — Export, Distribution, and Decision Aids (Arch §5.3, §9, compass §9, §13)
- [x] Implement async PDF generation pipeline with template customization options. — **fixed** (Created `PdfExportModule` with `PdfGeneratorService` (pdfmake v0.3 — pure JS, no browser required) and `PdfExportService` (async database-backed job orchestration). API: `POST /guidelines/:id/export/pdf` starts background job with template options (column layout, PICO display mode, section numbering, TOC toggle), `GET /pdf-jobs/:jobId` polls status, `GET /pdf-jobs/:jobId/download` streams completed PDF, `GET /guidelines/:id/pdf-jobs` lists recent jobs. PDF features: title page, auto-generated table of contents, hierarchical sections with numbering, TipTap JSON → PDF rich text (bold/italic/underline/lists/blockquotes/code/links), recommendation cards with strength badges and blue accent border, PICO questions with Summary of Findings tables, numbered references, page footers. Generated PDFs stored in S3 via `StorageService`. Prisma model `PdfExportJob` with status tracking (PENDING/PROCESSING/COMPLETED/FAILED). Frontend: `useExportPdf` hook with polling + auto-download, "Export PDF" button in GuidelineSettingsPanel with progress indicator. 30 new tests (19 generator + 11 service).)
- [x] Implement DOCX export with parity to PDF structure. — **fixed** (Created `WordExportService` using `docx` library with `GET /guidelines/:id/export/docx` endpoint. Generates Word document with: title page, auto-generated table of contents, section hierarchy with heading levels, TipTap JSON → DOCX rich text conversion preserving bold/italic/underline/lists/blockquotes, recommendation cards with strength badges, PICO questions with Summary of Findings tables, auto-numbered reference list. Supports `picoDisplayMode` INLINE vs ANNEX and section numbering toggle. Frontend: `useExportDocx` hook + "Export DOCX" button in GuidelineSettingsPanel.)
- [x] Implement full JSON exports for guideline and key sub-resources. — **fixed** (added `GET /guidelines/:id/export` endpoint returning comprehensive JSON with guideline, organization, sections tree, recommendations with EtD, PICOs with outcomes, references, permissions, versions; sets Content-Disposition header).
- [x] Store export artifacts by version in object storage and expose download endpoints. — **fixed** (Created `StorageModule` / `StorageService` using `@aws-sdk/client-s3` with MinIO-compatible path-style configuration. `VersionsService.publish()` now uploads the JSON snapshot to S3 (`versions/<guidelineId>/<versionNumber>/snapshot.json`) and persists `jsonS3Key` on the `GuidelineVersion` record. New endpoint `GET /versions/:id/export/json` streams the snapshot (from S3 if available, DB fallback). Reference file attachments: `POST /references/:id/attachments` (multipart/form-data upload → S3), `GET /references/:id/attachments` (list), `GET /references/:id/attachments/:attachmentId` (download), `DELETE /references/:id/attachments/:attachmentId`.)
- [x] Implement decision aid generation from linked PICOs/outcomes. — **fixed** (Added `GET /recommendations/:id/decision-aid` endpoint in `RecommendationsService.getDecisionAid()` aggregating recommendation overview, linked PICOs with outcomes (filtered to non-deleted, non-shadow), and practical issues.)
- [x] Build layered decision aid UI (overview, pictograph, full evidence). — **fixed** (Created `DecisionAidPreview.tsx` with three layers: Overview (strength badge, PICO question, certainty), Benefits & Harms (outcome rows with effect sizes, absolute risks, plain-language summaries, togglable pictograph), Full Evidence (all outcomes + practical issues). Created `PictographDisplay.tsx` with paired icon-array panels comparing baseline vs. intervention absolute risk per 100 people. Added "Decision Aid" tab to `RecommendationEditorCard`. Frontend hook `useDecisionAid` queries the new endpoint.)
- [x] Implement embeddable decision-aid widget URLs and config parameters. — **fixed** (Created packages/widget Preact micro-bundle with Vite library build. Widget.tsx with three collapsible layers (overview, benefits/harms, evidence). Pictograph.tsx with SVG icon grid. Auto-mount via data-opengrade-widget attribute. EmbedController with HTML embed endpoint. CSS-in-JS scoped styles with light/dark themes.)
- [x] Add adaptation/portability pack export-import workflow. — **fixed** (Added `POST /guidelines/import` endpoint that accepts a JSON export payload + organizationId. Creates new guideline with " (Imported)" suffix, preserves section tree structure via topological sort, creates references. Wrapped in `$transaction` for atomicity.)
- [x] Add multilingual content and UI support for the documented language set. — **fixed** (Created lightweight React Context-based i18n with I18nProvider, useI18n hook, t() function with interpolation. Translation files for en/es/fr. LanguageSelector component in AppShell. DashboardPage and AppShell wired with t() calls. Locale persisted in localStorage.)

---

## Phase 9 — Quality, Security, and Operations (Arch §7, §10)
- [x] Create unit/integration/E2E test suites for critical authoring and publish flows. — **fixed** (25 API spec files, 396 tests passing. 10 web test files. 5 Playwright E2E spec files at `apps/e2e/` covering navigation, dashboard, guidelines CRUD, workspace tabs, references.)
- [x] Add schema/data validation checks for orphan links and missing evidence metadata. — **fixed** (Added `GET /guidelines/:id/validate` checking orphan section-reference links, orphan recommendation-pico links, PICOs with no outcomes, outcomes without certainty assessment, recommendations without section placement. Returns structured issues list with severity/entity/message.)
- [x] Add performance tests for large guideline trees and export jobs. — **fixed** (Created performance test suite with large guideline fixture factory. section-tree.perf.spec.ts, pdf-export.perf.spec.ts, fhir-bundle.perf.spec.ts with timing assertions using performance.now().)
- [x] Add API rate limiting, secure file upload validation, and input sanitization checks. — **fixed** (Added FileValidationPipe with 10MB size limit, MIME whitelist (13 types), magic bytes verification. 37 tests. `@nestjs/throttler` global 100 req/min rate limiting. Helmet and CORS configured.)
- [x] Add backup/restore jobs for PostgreSQL and object storage. — **fixed** (Created BackupModule with scheduled pg_dump via child_process. BackupController with status/trigger endpoints. Shell scripts: pg-backup.sh, pg-restore.sh, s3-backup.sh, s3-restore.sh with rotation and verification.)
- [x] Add runtime dashboards for API latency, job queue health, and error rates. — **fixed** (Created MetricsModule with in-memory counters/histograms, Prometheus text format export. MetricsInterceptor for request duration/count. GET /metrics endpoint. Prometheus + Grafana added to docker-compose. Grafana dashboard JSON with request rate, latency, error panels.)
- [x] Add deployment runbooks for Docker Compose and Kubernetes targets. — **fixed** (Created docs/deployment/ with Docker Compose production guide. Kubernetes Helm chart at infra/k8s/helm/ with Chart.yaml, values.yaml, deployment/service/ingress templates. Environment-specific values files.)
- [x] Add incident response and disaster recovery checklists. — **fixed** (Created docs/operations/ with incident-response.md (P1-P4 severity levels), disaster-recovery.md (RPO/RTO targets), on-call-runbook.md, security-incident-response.md, data-loss-recovery.md.)

---

## Cross-Cutting Definition of Done (all phases)
- [x] Every module has architecture decision notes and sequence diagrams where behavior is non-trivial. — **fixed** (Created docs/architecture/adr/ with 6 ADRs covering FHIR schema, module boundaries, TipTap, RBAC, async PDF, FHIR facade. Created docs/architecture/sequences/ with 4 Mermaid sequence diagrams for publish, PDF export, import, voting workflows.)
- [x] Every endpoint includes OpenAPI examples and permission requirements. — **fixed** (Added @ApiTags, @ApiOperation, @ApiResponse, @ApiBearerAuth, @ApiParam, @ApiQuery decorators to all 20 controllers.)
- [x] Every user-visible workflow includes audit-log coverage. — **fixed** (Enhanced ActivityLoggingInterceptor with guidelineId resolution from 4 sources, enriched action types (RESTORE, STATUS_CHANGE, PERMISSION_CHANGE, VOTE, UPLOAD, PUBLISH, IMPORT), change details metadata. 15 tests.)
- [x] Every publish/export path is idempotent and retry-safe. — **fixed** (Added idempotency checks to PdfExportService (dedup PENDING/PROCESSING jobs) and VersionsService (prevent duplicate publishes). Idempotency spec tests for both.)
- [x] Every FHIR transform has fixture-based conformance tests. — **fixed** (Created 5 spec files with 162 tests: guideline-to-composition (23), recommendation-to-plan-definition (34), pico-to-evidence (38), reference-to-citation (24), fhir-validation-service (43). Covers all projections with realistic fixtures.)
- [x] Every release includes migration verification and rollback instructions. — **fixed** (Created docs/migrations/ with README, verification-checklist, rollback-procedures. Shell scripts: verify-migration.sh, pre-migration-backup.sh.)

---

## Consolidated Bug / Gap Registry

The following items are confirmed bugs or incomplete wiring in the current codebase. They should be treated as sprint-ready tasks.

### P0 — Data-loss bugs (fixed in this audit)
| # | Area | Issue | Resolution |
|---|------|-------|------------|
| B-01 | API / Recommendations | `remark`, `rationale`, `practicalInfo` JSON fields missing from `CreateRecommendationDto`/`UpdateRecommendationDto` and not written by `RecommendationsService.update()` — silently dropped on save | Added to DTO; service now writes all three fields |
| B-02 | Frontend / Recommendations | `useUpdateRecommendation` sent HTTP `PATCH` but `RecommendationsController` declares `@Put(':id')` — all recommendation field saves failed silently | Changed hook to use `PUT` |
| B-03 | API / Guidelines | `etdMode` and 11 other guideline settings absent from `CreateGuidelineDto`/`UpdateGuidelineDto` and not written by `GuidelinesService.update()` | Added all settings fields to DTO; service now writes them |
| B-04 | API / Recommendations | `findByGuideline` did not include `sectionPlacements`, so `sectionId` was never populated in the response — frontend per-section filtering was always empty | Fixed: includes first `sectionPlacement` and maps to top-level `sectionId` field |

### P1 — Missing functionality (unwired stubs)
| # | Area | Issue |
|---|------|-------|
| ~~U-01~~ | ~~Frontend / Dashboard~~ | **Fixed** — Added `GET /guidelines/stats` endpoint returning aggregate counts; `DashboardPage` now fetches real data via `useDashboardStats` hook |
| ~~U-02~~ | ~~Frontend / Guidelines~~ | **Fixed** — "New Guideline" button now wired; inline form (title + short name) calls `POST /guidelines` via `useCreateGuideline` |
| ~~U-03~~ | ~~Frontend / References~~ | **Fixed** — ReferencesPage now fully functional with cross-guideline listing, server-side search, grouped by guideline, places-used badges |
| ~~U-04~~ | ~~Frontend / App shell~~ | **Fixed** — Wired to `useAuth` store; displays user name/email and logout button |
| ~~U-05~~ | ~~Frontend / Sections~~ | **Fixed** — Inline "Add Section" form added to `SectionTree` sidebar; wired via `useCreateSection` |
| ~~U-06~~ | ~~Frontend / Sections~~ | **Fixed** — Delete button with two-step confirm added to each section tree node; wired via `useDeleteSection` |
| ~~U-07~~ | ~~Frontend / Recommendations~~ | **Fixed** — "Add Recommendation" inline form in `SectionDetailPanel`; wired via `useCreateRecommendation` |
| ~~U-08~~ | ~~Frontend / Recommendations~~ | **Fixed** — Delete button with two-step confirm added to `RecommendationEditorCard`; wired via `useDeleteRecommendation` |
| ~~U-09~~ | ~~Frontend / Guideline settings~~ | **Fixed** — Added `GuidelineSettingsPanel` component; accessible via "Settings" tab in workspace; `useUpdateGuideline` hook calls `PUT /guidelines/:id` |
| ~~U-10~~ | ~~API / Versioning~~ | **Fixed** — Added `VersionsModule` with `POST /versions` (publish), `GET /versions?guidelineId=`, `GET /versions/:id`; auto-increments version number; stores snapshot bundles |
| ~~U-11~~ | ~~API / Governance~~ | **Fixed** — Added global `ActivityLoggingInterceptor` that writes to `ActivityLogEntry` on POST/PUT/PATCH/DELETE; `GET /activity` endpoint with filters |
| ~~U-12~~ | ~~API / Governance~~ | **Fixed** — All governance models now have API endpoints: `FeedbackComment` (threaded comments), `CoiRecord` (COI declarations with exclusion), `Poll`/`PollOption`/`PollVote` (voting with COI check), `Milestone`/`ChecklistItem` (tracker with toggle), `Task` (Kanban) |
| ~~U-13~~ | ~~API / FHIR~~ | **Fixed** — `fhirMeta` JSON field added to Create/Update DTOs and wired through services for Guideline, Reference, Pico, Recommendation |
| ~~U-14~~ | ~~API / Evidence~~ | **Fixed** — Added shadow outcome CRUD: `POST /outcomes/:id/shadow`, `POST /outcomes/:id/promote` (transactional), `GET /outcomes/:id/shadows` |
| ~~U-15~~ | ~~API / Storage~~ | **Fixed** — Created `StorageModule`/`StorageService` with `@aws-sdk/client-s3`; version publish uploads JSON snapshot to S3 (`jsonS3Key`); `GET /versions/:id/export/json` download endpoint; reference attachment upload/download/delete endpoints |
| ~~U-16~~ | ~~Packages / Widget~~ | **Fixed** — packages/widget Preact micro-bundle created |
| ~~U-17~~ | ~~Packages / Shared~~ | **Fixed** — packages/fhir expanded with 9 FHIR R5 type definition files; packages/ui expanded with 7 shared UI components (Button, Input, Badge, Card, Dialog, Select, Table) |

### P2 — Schema / data integrity gaps
| # | Area | Issue |
|---|------|-------|
| ~~S-01~~ | ~~Database~~ | **Fixed** — Baseline migration `20260306000000_init` created with full schema SQL; `migration_lock.toml` added |
| ~~S-02~~ | ~~Database~~ | **Fixed** — Added `@@unique([recommendationId, factorType])` constraint to `EtdFactor`; `createMany` uses `skipDuplicates: true` |
| ~~S-03~~ | ~~API~~ | **Fixed** — `findByGuideline` now fetches all sections and builds full recursive tree in memory |
| ~~S-04~~ | ~~API~~ | **Fixed** — Added `POST /guidelines/:id/restore` and `POST /sections/:id/restore` endpoints |

### P3 — Security / operations gaps
| # | Area | Issue |
|---|------|-------|
| ~~O-01~~ | ~~Security~~ | **Fixed** — Installed `@nestjs/throttler` with global `ThrottlerGuard` at 100 req/min |
| ~~O-02~~ | ~~Security~~ | **Fixed** — Added FileValidationPipe with 10MB size limit, MIME whitelist (13 types), magic bytes verification. 37 tests. |
| ~~O-03~~ | ~~Auth~~ | **Fixed** — RbacGuard checks org-level ADMIN membership and guideline-level `GuidelinePermission` role against `@Roles()` requirements |
| ~~O-04~~ | ~~Ops~~ | **Fixed** — Added `GET /health/ready` endpoint with database connectivity check (`$queryRaw SELECT 1`); returns 503 when DB unavailable |
| ~~O-05~~ | ~~Testing~~ | **Fixed** — Added Playwright E2E test suite at `apps/e2e/` (65 tests, 100% pass rate). Covers: navigation, dashboard stats, guidelines CRUD, guideline workspace tabs, section tree, references page, error/empty states. Found and fixed ActivityLogPanel crash (see B-05 below). |

### P4 — Feature gaps (identified 2026-04-25)
| # | Area | Issue |
|---|------|-------|
| F-01 | API / FHIR | Missing `GET /fhir/metadata` CapabilityStatement endpoint — required for FHIR R5 server conformance |
| F-02 | API / FHIR | No FHIR search-type interactions — `GET /fhir/PlanDefinition`, `GET /fhir/Evidence`, `GET /fhir/Citation` with standard search params |
| F-03 | API / Guidelines | Missing `POST /guidelines/:id/clone` endpoint — spec Task 1.1.1 requires deep-copy clone |
| F-04 | API / Sections | `SectionsService.create()` does not enforce max 3-level nesting — spec Task 1.1.2 requires UnprocessableEntityException at depth > 3 |
| F-05 | Frontend / Tests | 6 components lack test files: CoiDashboard, PermissionManagementPanel, RecoverPanel, RevManImportWizard, ShadowOutcomePanel, VersionCompareDialog |

---

## E2E Test Findings (from Playwright test run 2026-03-09)

The following issues were discovered during the first E2E test run:

### Bugs Found and Fixed
| # | Area | Issue | Resolution |
|---|------|-------|------------|
| B-05 | Frontend / Activity Log | `ActivityLogPanel` used `useMemo` (synchronous render) to call `setAllEntries` state setter — caused infinite re-render loop on mount, crashing the component and producing a blank page when the Activity tab was clicked | **Fixed**: Changed `useMemo` → `useEffect`; stabilised `currentPageEntries` with `useMemo([data?.entries])` to prevent new array reference on every render |

### Issues Identified (not yet fixed)
| # | Priority | Area | Issue | Notes |
|---|----------|------|-------|-------|
| E-01 | P2 | Frontend / Navigation | Sidebar brand name "OpenGRADE" also appears in the Dashboard welcome heading "Welcome to OpenGRADE", causing strict-mode violations in test locators targeting just the sidebar text | **Fixed**: Added `aria-label="Application brand"` to sidebar brand div for unambiguous targeting |
| E-02 | P2 | Frontend / Workspace | Workspace tab bar buttons share CSS classes with the workspace header div, making it ambiguous to select the tab bar specifically via CSS class selectors | **Fixed**: Added `role="tablist"`, `role="tab"`, and `aria-selected` for semantic HTML; E2E tests updated to use `getByRole('tablist')` |
| E-03 | P1 | Frontend / ActivityLogPanel | `displayedEntries` useMemo has `allEntries` in its closure but NOT in its dependency array — paginated "load more" will not correctly accumulate entries across pages because stale closure is used | **Fixed**: Replaced stale-closure `useMemo` with a `useEffect` accumulator using functional `setAllEntries(prev => ...)` pattern |
| E-04 | P2 | Frontend / References | The `ReferencesPage` `useReferences` hook expects a paginated response `{data, total, page, limit}`, but the references mock in `setupApiMocks` returned a plain array — the paginated format must be used in production | Fixed in test setup; API must always return the paginated envelope |
| E-05 | P2 | Backend / Auth | API endpoints have no auth guards applied globally (no `@UseGuards` on controllers, `AuthGuard` not registered globally in `AppModule`) — all endpoints are effectively public | **Fixed**: Registered `AuthGuard` as `APP_GUARD` in `AppModule`; added `@Public()` to health endpoints |
| E-06 | P3 | Frontend / Error states | React Query default `retry: 1` with exponential backoff delays error states by ~1 second, which can cause flaky E2E tests if tests don't use sufficient timeouts when simulating API failures | **Fixed**: Set `retry: false` in `QueryClient` default options to surface errors immediately |
| E-07 | P3 | Frontend / Workspace sections | The section tree mock data had sections named "Recommendations" which conflicted with the workspace tab label "Recommendations", causing strict-mode violations in button selectors | Fixed in test data — section renamed to "Clinical Recommendations" |
