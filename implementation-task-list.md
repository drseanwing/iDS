# OpenGRADE Implementation Task List (Derived from Architecture Docs)

Source docs:
- `opengrade-architecture.md`
- `compass_artifact_wf-ac90d96b-1eee-4206-9b48-09594f3da2b5_text_markdown.md` (MAGICapp reverse-engineering technical specification artifact)

> **Audit status**: Last reviewed 2026-03-06. All items verified against live codebase. Latest batch: RBAC guard, guideline permissions CRUD, JSON export, shadow outcomes, COI/polls/milestones/tasks.
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
  - [~] Practical issues (16 categories from grounded theory) for PICO — **fixed** (added `PracticalIssue` CRUD endpoints on `/picos/:picoId/practical-issues` with `CreatePracticalIssueDto` supporting all 16 categories; service methods `addPracticalIssue`, `updatePracticalIssue`, `removePracticalIssue` added to PicosService). _(UI not yet built in PicoBuilderPanel.)_
  - [~] Reference "places used" tracking — **fixed** (top-level ReferencesPage now shows section and outcome link badges per reference; API `findAll` includes `sectionPlacements` and `outcomeLinks` with titles).
  - [x] Reference auto-numbering on read — **fixed** (added `computeReferenceNumbers()` to ReferencesService with depth-first section tree traversal; `GET /references/numbered?guidelineId=` endpoint returns numbering map; `findAll` attaches `referenceNumber` to each reference when guidelineId is provided).
  - [ ] Track changes in TipTap — not implemented (extension not installed, no accept/reject workflow).
  - [ ] Presence/collaborative cursor indicators — not implemented.
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
- [x] Implement shadow outcome workflow for evidence updates. — **fixed** (API: create/promote/list shadows. UI: `ShadowOutcomePanel` with create shadow button, side-by-side evidence comparison, promote/discard actions with confirmation.)
- [ ] Add RevMan (`.rm5`) parsing/import pipeline and outcome matching controls. _(No parser, no import wizard, no background job infrastructure.)_

---

## Phase 5 — Workflow, Versioning, and Publishing (Arch §3.1, §5, §9.4)
- [x] Implement recommendation and guideline state machine transitions. — **fixed** (guideline: `PUT /guidelines/:id/status` with allowed-transitions map; recommendation: `PUT /recommendations/:id/status` with RecStatus enum [NEW, UPDATED, IN_REVIEW, POSSIBLY_OUTDATED, UPDATED_EVIDENCE, REVIEWED, NO_LABEL] and optional comment + timestamp).
- [~] Implement publish actions (minor/major) and version comment capture. — **partially fixed** (added `VersionsModule` with `POST /versions` to create version snapshots, `GET /versions?guidelineId=` listing, auto-incremented version numbering via `computeNextVersion()`. **UI added**: `VersionHistoryPanel` + `PublishDialog` with major/minor selection, version preview, comment, public toggle; accessible via "Versions" tab in workspace.)
- [x] Auto-create next draft after publish and mark prior versions as out-of-date. — **fixed** (publish resets guideline to DRAFT; MAJOR publish marks prior public versions as superseded via `isPublic: false`.)
- [ ] Separate publishing from public visibility toggle with guardrails. _(`isPublic` field now settable via API but no publish workflow enforces it.)_
- [x] Implement permalink strategy (`shortName`, latest public, explicit version URL). — **fixed** (added `GET /guidelines/by-slug/:shortName` for slug resolution, `GET /guidelines/by-slug/:shortName/latest` for latest public version snapshot.)
- [~] Generate and store immutable version snapshot bundles. — **fixed** (enhanced `VersionsService.publish()` to capture comprehensive snapshots including full guideline metadata, organization, sections tree, recommendations with EtD factors, PICOs with outcomes/codes/practical issues, references with all links). _(Snapshot is stored as structured JSON, not FHIR Bundle — FHIR transformation deferred to Phase 7.)_
- [~] Add version history UI with compare and navigation affordances. — **partially fixed** (added `GET /versions/compare?v1=:id1&v2=:id2` endpoint returning both snapshots for frontend diffing. **UI added**: `VersionHistoryPanel` lists versions with type badges, dates, publisher names, JSON export download. Compare UI not yet built.)
- [ ] Enforce edit redirection from historic version to active draft.

---

## Phase 6 — Collaboration, Permissions, and Governance (Arch §4.2, §6, §9.3)
- [x] Implement full RBAC matrix (organization roles + guideline roles). — **fixed** (RbacGuard with @Roles() applied to all 9 controllers: mutations restricted to ADMIN/AUTHOR, publish/permissions to ADMIN only, comments allow REVIEWER, GET endpoints unrestricted.)
- [~] Implement activity logging interceptor for create/update/delete/publish flows. — **fixed** (added global `ActivityLoggingInterceptor` registered as `APP_INTERCEPTOR`; logs POST/PUT/PATCH/DELETE operations best-effort via `ActivityService.log()`; `ActivityModule` is `@Global()`).
- [x] Build activity log screen with user/action/entity/date filters. — **fixed** (API: `GET /activity?guidelineId=` with filters. UI: `ActivityLogPanel` with entity type, action type dropdowns, text filter, relative timestamps, action badges, load-more pagination. Accessible via "Activity" tab in workspace.)
- [~] Implement undo/recover flows for soft-deleted content. _(Restore API endpoints added for guidelines and sections. Admin UI for browsing/restoring deleted content not yet built.)_
- [ ] Implement track changes model and rendering in rich-text fields.
- [ ] Add accept/reject tracked changes workflow with role checks.
- [x] Implement threaded comments and status workflow (open/resolved/deprecated). — **fixed** (API: full CRUD with threading and status transitions. UI: `CommentsPanel` with threaded display, inline reply forms, status badges, resolve/delete actions. Accessible via "Comments" sub-tab in RecommendationEditorCard.)
- [x] Implement COI matrix storage and intervention/member conflict views. — **fixed** (API: full CRUD. UI: `CoiDashboard` with conflict type badges, voting exclusion indicators, inline create/edit forms, expandable disclosure text. Accessible via "COI" tab in workspace.)
- [~] Add voting exclusion logic linked to COI declarations. — **partially fixed** (PollsService `castVote` checks CoiRecord `isExcludedFromVoting` flag and throws ForbiddenException if user is excluded).
- [x] Implement Poll/Delphi voting tool. — **fixed** (API: full CRUD with voting and COI exclusion check. UI: `PollsPanel` with poll creation, inline voting per type (OPEN_TEXT, MULTIPLE_CHOICE, STRENGTH_VOTE, ETD_JUDGMENT), close poll, vote tally. Accessible via "Polls" tab in workspace.)
- [x] Implement Milestone tracker with AGREE II / SNAP-IT checklists. — **fixed** (API: full CRUD with checklist items and toggle. UI: `MilestonesPanel` with progress bar, vertical timeline, completion checkboxes, color-coded dates, checklist items with toggle. Accessible via "Milestones" tab in workspace.)
- [x] Implement Task manager (Kanban board). — **fixed** (API: full CRUD with status/assignee filters. UI: `TaskBoard` Kanban with TODO/IN_PROGRESS/DONE columns, task cards with assignee badges, due date color-coding, status-change buttons, inline create form. Accessible via "Tasks" tab in workspace.)
- [x] Build guideline permission management UI (invite members, assign roles). — **fixed** (API: CRUD endpoints for permissions. UI: `PermissionManagementPanel` with member list, role badges (ADMIN/AUTHOR/REVIEWER/VIEWER), add member form, remove with confirm. Embedded in GuidelineSettingsPanel.)

---

## Phase 7 — Interoperability & Clinical Integration (Arch §2, §6.2, §9.5, §14)
- [ ] Implement internal projection layer from domain models to FHIR resources.
- [ ] Implement FHIR mappings for Organization, Composition, PlanDefinition, Evidence, EvidenceVariable, Citation.
- [ ] Implement read-only `/fhir/*` facade endpoints with core search params.
- [ ] Implement guideline version snapshot as FHIR Bundle document export.
- [ ] Add ETag/Last-Modified support for FHIR read operations.
- [ ] Implement terminology lookup integration (SNOMED CT, ICD-10, ATC, RxNorm) via BioPortal proxy with Redis cache.
- [ ] Implement EMR element modeling on recommendations. _(EmrElement model referenced in architecture but absent from Prisma schema.)_
- [ ] Build clinical codes API for downstream EHR consumption.
- [ ] Validate produced resources against selected CPG-on-FHIR and EBM-on-FHIR profiles.

---

## Phase 8 — Export, Distribution, and Decision Aids (Arch §5.3, §9, compass §9, §13)
- [ ] Implement async PDF generation pipeline with template customization options. _(No Bull queue, no worker process, no PDF library.)_
- [ ] Implement DOCX export with parity to PDF structure.
- [x] Implement full JSON exports for guideline and key sub-resources. — **fixed** (added `GET /guidelines/:id/export` endpoint returning comprehensive JSON with guideline, organization, sections tree, recommendations with EtD, PICOs with outcomes, references, permissions, versions; sets Content-Disposition header).
- [ ] Store export artifacts by version in object storage and expose download endpoints. _(MinIO provisioned in Docker Compose but no S3 client integration in the API.)_
- [ ] Implement decision aid generation from linked PICOs/outcomes.
- [ ] Build layered decision aid UI (overview, pictograph, full evidence).
- [ ] Implement embeddable decision-aid widget URLs and config parameters. _(Architecture describes a `packages/widget` Preact micro-bundle; directory does not exist.)_
- [ ] Add adaptation/portability pack export-import workflow.
- [ ] Add multilingual content and UI support for the documented language set. _(Language field on Guideline exists; no i18n framework for the UI.)_

---

## Phase 9 — Quality, Security, and Operations (Arch §7, §10)
- [~] Create unit/integration/E2E test suites for critical authoring and publish flows. _(Unit tests exist for all API services and most web components — 64 API + 68 web tests. No integration tests against a real database; no E2E tests.)_
- [ ] Add schema/data validation checks for orphan links and missing evidence metadata.
- [ ] Add performance tests for large guideline trees and export jobs.
- [ ] Add API rate limiting, secure file upload validation, and input sanitization checks. _(Helmet and CORS are configured; no rate limiting middleware; no file upload endpoints.)_
- [ ] Add backup/restore jobs for PostgreSQL and object storage.
- [ ] Add runtime dashboards for API latency, job queue health, and error rates.
- [ ] Add deployment runbooks for Docker Compose and Kubernetes targets.
- [ ] Add incident response and disaster recovery checklists.

---

## Cross-Cutting Definition of Done (all phases)
- [ ] Every module has architecture decision notes and sequence diagrams where behavior is non-trivial.
- [ ] Every endpoint includes OpenAPI examples and permission requirements.
- [ ] Every user-visible workflow includes audit-log coverage.
- [ ] Every publish/export path is idempotent and retry-safe.
- [ ] Every FHIR transform has fixture-based conformance tests.
- [ ] Every release includes migration verification and rollback instructions.

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
| U-15 | API / Storage | MinIO provisioned in Docker Compose but no S3 client code in the API; no file upload endpoints |
| U-16 | Packages / Widget | Architecture specifies `packages/widget` Preact micro-bundle; directory does not exist |
| U-17 | Packages / Shared | `packages/fhir` has only stub types; `packages/ui` has only `cn()` utility — no FHIR serializers or shared UI components |

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
| O-01 | Security | No API rate limiting middleware |
| O-02 | Security | No file upload endpoints exist yet; upload validation not specified |
| O-03 | Auth | RBAC guard validates JWT signature but does not enforce guideline-level role permissions |
| ~~O-04~~ | ~~Ops~~ | **Fixed** — Added `GET /health/ready` endpoint with database connectivity check (`$queryRaw SELECT 1`); returns 503 when DB unavailable |
| O-05 | Testing | No integration tests against a real database; no E2E test suite |
