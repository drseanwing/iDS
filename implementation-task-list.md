# OpenGRADE Implementation Task List (Derived from Architecture Docs)

Source docs:
- `opengrade-architecture.md`
- `compass_artifact_wf-ac90d96b-1eee-4206-9b48-09594f3da2b5_text_markdown.md` (MAGICapp reverse-engineering technical specification artifact)

> **Audit status**: Last reviewed 2026-03-06. All items verified against live codebase.
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
- [ ] Implement migration set for all core tables with referential integrity. _(Only `schema.prisma` + `seed.ts` exist; no `prisma/migrations/` directory. Dev uses `prisma db push`. Formal migration history required before production deployment.)_
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
  - [ ] `fhirMeta` and `fhirExtensions` columns defined in Prisma schema but never read or written via any API endpoint.
  - [ ] `EtdFactor` model has no `@@unique([recommendationId, factorType])` constraint — duplicate factor rows can be created if `getOrInit()` is called concurrently.
  - [ ] `GET /sections` returns only one level of nested `children` (grandchildren excluded). Deep section trees need recursive fetch or a dedicated tree endpoint.
  - [ ] `SectionsService.findByGuideline` returns top-level sections only; child sections are embedded under their parent but NOT separately enumerable without a parent ID filter.
  - [ ] Soft-deleted content is permanently inaccessible — no admin/restore endpoint exists.
  - [ ] `ReferencesPage` (top-level `/references` app path) is a "Coming soon" stub. The `ReferenceList` component inside the guideline workspace IS functional.
  - [ ] `GuidelinesPage` "New Guideline" button is not wired — no create form or modal exists.
  - [ ] `DashboardPage` stats (Guidelines / Sections / Recommendations counts) are hardcoded as `'--'` — no real data fetching.
  - [ ] `AppShell` user section shows hardcoded "User" text — not wired to auth context.

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
  - [ ] PICO narrative summary field — Prisma schema has `narrative Json?` but it is not exposed in the PICO builder UI.
  - [ ] Practical issues (16 categories from grounded theory) for PICO — schema and service missing, not in PICO builder.
  - [ ] Reference "places used" tracking — schema has the relation but no UI surface showing where each reference is linked.
  - [ ] Reference auto-numbering on read — architecture specifies depth-first traversal numbering, not yet implemented.
  - [ ] Track changes in TipTap — not implemented (extension not installed, no accept/reject workflow).
  - [ ] Presence/collaborative cursor indicators — not implemented.
  - [ ] Guideline settings UI — no settings panel; `etdMode`, `showSectionNumbers` and other settings cannot be changed by the user.
  - [ ] `AppShell` top-level references tab — page is a stub ("Coming soon").

---

## Phase 4 — Evidence Engine (GRADE + EtD) (Arch §3.1, §5.3, §8, §9)
- [x] Implement outcome evidence fields (effect measures, CI bounds, participant counts).
- [x] Implement GRADE certainty model and downgrade/upgrade factor persistence.
- [x] Build GRADE assessment UI (risk of bias, inconsistency, indirectness, imprecision, publication bias, upgrades).
- [x] Implement plain-language summary field for each outcome.
- [x] Implement EtD models for 4-factor, 7-factor, and 12-factor modes.
- [x] Build EtD UI grids with per-intervention judgments and color labels.
- [x] Implement mode switching without data loss (hidden-but-preserved factors).
- [ ] Implement shadow outcome workflow for evidence updates. _(Prisma schema has `isShadow`/`shadowOf` fields on Outcome but no service logic or UI for creating/promoting shadow outcomes.)_
- [ ] Add RevMan (`.rm5`) parsing/import pipeline and outcome matching controls. _(No parser, no import wizard, no background job infrastructure.)_

---

## Phase 5 — Workflow, Versioning, and Publishing (Arch §3.1, §5, §9.4)
- [ ] Implement recommendation and guideline state machine transitions. _(Prisma schema has `status` enum on Guideline and `recStatus`/`recStatusDate`/`recStatusComment` on Recommendation, but no service methods or API endpoints exist to drive transitions.)_
- [ ] Implement publish actions (minor/major) and version comment capture. _(GuidelineVersion model exists in schema but no versioning service, controller, or UI.)_
- [ ] Auto-create next draft after publish and mark prior versions as out-of-date.
- [ ] Separate publishing from public visibility toggle with guardrails. _(`isPublic` field now settable via API but no publish workflow enforces it.)_
- [ ] Implement permalink strategy (`shortName`, latest public, explicit version URL).
- [ ] Generate and store immutable version snapshot bundles. _(Schema has `snapshotBundle Json?` on GuidelineVersion but no generation logic.)_
- [ ] Add version history UI with compare and navigation affordances.
- [ ] Enforce edit redirection from historic version to active draft.

---

## Phase 6 — Collaboration, Permissions, and Governance (Arch §4.2, §6, §9.3)
- [ ] Implement full RBAC matrix (organization roles + guideline roles). _(Auth guard validates JWT; GuidelinePermission/OrganizationMember models exist in schema; no RBAC enforcement on any endpoint beyond authentication check.)_
- [ ] Implement activity logging interceptor for create/update/delete/publish flows. _(ActivityLogEntry model defined in schema; no interceptor writes to it.)_
- [ ] Build activity log screen with user/action/entity/date filters.
- [ ] Implement undo/recover flows for soft-deleted content. _(No restore endpoint; soft-deleted content is inaccessible but not purged.)_
- [ ] Implement track changes model and rendering in rich-text fields.
- [ ] Add accept/reject tracked changes workflow with role checks.
- [ ] Implement threaded comments and status workflow (open/resolved/deprecated). _(FeedbackComment model defined in schema; no endpoints or UI.)_
- [ ] Implement COI matrix storage and intervention/member conflict views. _(CoiRecord model defined in schema; no endpoints or UI.)_
- [ ] Add voting exclusion logic linked to COI declarations.
- [ ] Implement Poll/Delphi voting tool. _(Poll model defined in schema; no endpoints or UI.)_
- [ ] Implement Milestone tracker with AGREE II / SNAP-IT checklists. _(Milestone and ChecklistItem models defined in schema; no endpoints or UI.)_
- [ ] Implement Task manager (Kanban board). _(Task model defined in schema; no endpoints or UI.)_
- [ ] Build guideline permission management UI (invite members, assign roles).

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
- [ ] Implement full JSON exports for guideline and key sub-resources.
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
| U-01 | Frontend / Dashboard | `DashboardPage` stats (Guidelines, Sections, Recommendations) are hardcoded `'--'` — no API calls |
| ~~U-02~~ | ~~Frontend / Guidelines~~ | **Fixed** — "New Guideline" button now wired; inline form (title + short name) calls `POST /guidelines` via `useCreateGuideline` |
| U-03 | Frontend / References | Top-level `ReferencesPage` (app nav → References) is a "Coming soon" stub — `ReferenceList` inside workspace is functional |
| U-04 | Frontend / App shell | User display in `AppShell` sidebar shows hardcoded "User" — not wired to auth context |
| ~~U-05~~ | ~~Frontend / Sections~~ | **Fixed** — Inline "Add Section" form added to `SectionTree` sidebar; wired via `useCreateSection` |
| ~~U-06~~ | ~~Frontend / Sections~~ | **Fixed** — Delete button with two-step confirm added to each section tree node; wired via `useDeleteSection` |
| ~~U-07~~ | ~~Frontend / Recommendations~~ | **Fixed** — "Add Recommendation" inline form in `SectionDetailPanel`; wired via `useCreateRecommendation` |
| ~~U-08~~ | ~~Frontend / Recommendations~~ | **Fixed** — Delete button with two-step confirm added to `RecommendationEditorCard`; wired via `useDeleteRecommendation` |
| U-09 | Frontend / Guideline settings | No settings panel — `etdMode`, `showSectionNumbers` and all other guideline settings are uneditable in the UI |
| U-10 | API / Versioning | `GuidelineVersion` Prisma model exists but no service, controller, or frontend code |
| U-11 | API / Governance | `ActivityLogEntry` model exists but no interceptor writes to it |
| U-12 | API / Governance | `FeedbackComment`, `CoiRecord`, `Poll`, `Milestone`, `ChecklistItem`, `Task` models exist but have no API endpoints |
| U-13 | API / FHIR | `fhirMeta` and `fhirExtensions` JSON columns defined on entities but never read or written |
| U-14 | API / Evidence | Shadow outcome fields (`isShadow`, `shadowOf`) exist in Prisma Outcome model but no service logic or UI |
| U-15 | API / Storage | MinIO provisioned in Docker Compose but no S3 client code in the API; no file upload endpoints |
| U-16 | Packages / Widget | Architecture specifies `packages/widget` Preact micro-bundle; directory does not exist |
| U-17 | Packages / Shared | `packages/fhir` has only stub types; `packages/ui` has only `cn()` utility — no FHIR serializers or shared UI components |

### P2 — Schema / data integrity gaps
| # | Area | Issue |
|---|------|-------|
| S-01 | Database | No `prisma/migrations/` directory — schema managed via `prisma db push`; no migration history |
| S-02 | Database | `EtdFactor` lacks `@@unique([recommendationId, factorType])` — concurrent `getOrInit()` calls can create duplicate rows |
| S-03 | API | `GET /sections` embeds only one level of `children`; grandchildren require separate requests |
| S-04 | API | No soft-delete restore endpoint; deleted content is permanently inaccessible via API |

### P3 — Security / operations gaps
| # | Area | Issue |
|---|------|-------|
| O-01 | Security | No API rate limiting middleware |
| O-02 | Security | No file upload endpoints exist yet; upload validation not specified |
| O-03 | Auth | RBAC guard validates JWT signature but does not enforce guideline-level role permissions |
| O-04 | Ops | No health-check for database connectivity in Docker Compose `depends_on` for the API service |
| O-05 | Testing | No integration tests against a real database; no E2E test suite |

