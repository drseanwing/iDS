# Phase 1 — Foundation + Authoring MVP (Weeks 1–8)

> **Dependencies**: Phase 0 (infrastructure, core module, Prisma schema)
> **Goal**: Author can create a guideline with sections, references, and structured recommendations. Admin can manage permissions and publish a version.
> **Deliverable**: Functional guideline authoring tool that can create, structure, and publish guidelines with references and basic recommendations.

---

## 1.1 Guideline Authoring Module — Backend (`@app/guideline-authoring`)

### Task 1.1.1 — GuidelineService (CRUD)
- Implement `create(dto, userId)`:
  - Create Guideline record with defaults (status=DRAFT, etdMode=SEVEN_FACTOR, all boolean flags from schema)
  - Auto-create the creator's GuidelinePermission with role=ADMIN
  - Generate `shortName` slug from title (URL-friendly, unique)
  - Initialize `fhirMeta` with versionId=1, lastUpdated=now
  - Emit `guideline.created` event
- Implement `findAll(userId, orgId?)`:
  - Return guidelines where user has a GuidelinePermission OR user is org admin of the guideline's org
  - Include counts: sections, recommendations, picos, references
  - Filter by organization, status, isPublic
  - Paginate with cursor-based pagination
- Implement `findOne(id)`:
  - Return guideline with nested section tree (recursive)
  - Include permission summary for current user
- Implement `update(id, dto)`:
  - Partial update of all Guideline settings fields
  - Validate `shortName` uniqueness on change
  - Update `fhirMeta.lastUpdated`
  - Emit `guideline.updated` event
- Implement `softDelete(id)`:
  - Set `isDeleted = true`
  - Emit `guideline.deleted` event
- Implement `clone(id, userId)`:
  - Deep-copy guideline with all sections, references, recommendations, PICOs
  - Prefix title with "COPY OF"
  - Reset status to DRAFT, clear version history
  - New creator = current user
- Implement `importFromZip(file, userId)`:
  - Parse ZIP file containing exported guideline JSON + reference files
  - Create new guideline with "IMPORT OF" prefix
  - Deduplicate references by DOI/PMID during import
- **Quality gate**: All CRUD operations work, clone produces accurate deep copy
- **Tests**:
  - Unit: Create guideline sets correct defaults; shortName generation handles special characters
  - Integration: Clone preserves all nested entities; import handles deduplication
  - E2E: Create → Read → Update → Delete cycle via API

### Task 1.1.2 — SectionService (Recursive Tree CRUD)
- Implement `create(guidelineId, dto)`:
  - Create section with parentId (nullable for top-level)
  - Auto-assign `ordering` (max + 1 within parent)
  - Calculate `nestingLevel` from parent chain
  - Business rule: validate nestingLevel ≤ 3 (section → sub-section → sub-sub-section)
  - Emit `section.created` event
- Implement `findTree(guidelineId)`:
  - Return complete section tree with recursive children
  - Include counts of linked references, PICOs, recommendations per section
  - Order by `ordering` at each level
- Implement `update(id, dto)`:
  - Update title, text (TipTap JSON), excludeFromNumbering
  - Business rule: cannot exclude sub-section numbering if parent is numbered
  - Update `fhirMeta.lastUpdated` on parent guideline
  - Emit `section.updated` event
- Implement `reorder(guidelineId, orderedIds[])`:
  - Accept flat array of section IDs in desired order (with parentId for each)
  - Update all `ordering` values in a single transaction
  - Recalculate `nestingLevel` for moved sections
  - Emit `section.reordered` event
- Implement `softDelete(id)`:
  - Recursively soft-delete all child sections
  - Emit `section.deleted` event
- **Quality gate**: Recursive tree operations maintain referential integrity
- **Tests**:
  - Unit: Nesting validation rejects level > 3; numbering exclusion business rule enforced
  - Integration: Reorder updates all ordering values atomically; delete cascades to children
  - E2E: Create nested sections → reorder → verify tree structure via GET

### Task 1.1.3 — GuidelineController (REST Endpoints)
- Implement all guideline authoring endpoints:
  - `GET /api/v1/guidelines` — list with pagination and filters
  - `POST /api/v1/guidelines` — create
  - `GET /api/v1/guidelines/:id` — get with section tree
  - `PUT /api/v1/guidelines/:id` — update metadata/settings
  - `DELETE /api/v1/guidelines/:id` — soft delete
  - `POST /api/v1/guidelines/:id/clone` — clone
  - `POST /api/v1/guidelines/:id/import` — import from ZIP
  - `GET /api/v1/guidelines/:id/sections` — section tree
  - `POST /api/v1/guidelines/:id/sections` — create section
  - `PUT /api/v1/sections/:id` — update section
  - `DELETE /api/v1/sections/:id` — soft delete section
  - `PUT /api/v1/guidelines/:id/sections/reorder` — batch reorder
- Apply `@Roles()` decorators:
  - Create/update/delete/clone/import: `ADMIN`, `AUTHOR`
  - Read: `ADMIN`, `AUTHOR`, `REVIEWER`, `VIEWER`
- Add request validation DTOs with class-validator
- Add OpenAPI decorators for Swagger documentation
- **Quality gate**: All endpoints return correct HTTP status codes and response shapes
- **Tests**: E2E tests for each endpoint including auth (401), permission (403), validation (400), success (200/201)

### Task 1.1.4 — GuidelineFhirProjection (Composition Resource)
- Create `GuidelineFhirProjectionService`:
  - `toComposition(guideline): Composition` — maps guideline to FHIR R5 Composition
    - `status` → maps GuidelineStatus to Composition.status (preliminary/final)
    - `type` → CodeableConcept for clinical-practice-guideline
    - `title` → Composition.title
    - `section[]` → recursive mapping from Section tree to Composition.section
    - Each section includes `section.text` as Narrative (TipTap → XHTML)
    - `author[]` → References to Practitioner resources for guideline admins/authors
    - `custodian` → Reference to Organization
    - `meta` → from guideline.fhirMeta
- **Quality gate**: Output validates against FHIR R5 Composition StructureDefinition
- **Test**: Unit test — sample guideline with 3-level sections produces valid Composition JSON

---

## 1.2 Reference Management Module — Backend (`@app/reference-management`)

### Task 1.2.1 — ReferenceService (CRUD + Import)
- Implement `create(guidelineId, dto)`:
  - Manual creation with all Reference fields
  - Validate PubMed ID format (8 digits) if provided
  - Validate DOI format if provided
  - Emit `reference.created` event
- Implement `findAll(guidelineId)`:
  - Return references with "places used" counts (count of SectionReference + OutcomeReference links)
  - Support full-text search via PostgreSQL tsvector index
  - Paginate
- Implement `update(id, dto)`:
  - Partial update of reference fields
- Implement `softDelete(id)`:
  - Business rule: cannot delete if reference is linked to any PICO outcome (check OutcomeReference count)
  - Return 409 Conflict with descriptive message if blocked
  - Emit `reference.deleted` event
- **Quality gate**: "In use" references cannot be deleted
- **Tests**:
  - Unit: Deletion blocked when OutcomeReference exists; PubMed ID validation
  - Integration: Full-text search returns relevant results
  - E2E: CRUD cycle + deletion prevention

### Task 1.2.2 — PubmedImportService
- Implement `importByPmid(guidelineId, pmid)`:
  - Call NCBI E-utilities API: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={pmid}&retmode=xml`
  - Parse XML response to extract: title, authors, year, abstract, DOI, journal
  - Create Reference record with parsed data
  - Handle errors: invalid PMID, network failure, rate limiting (NCBI allows 3 req/sec without API key)
- **Quality gate**: PubMed import populates all available fields
- **Tests**:
  - Unit: XML parsing extracts correct fields from sample PubMed XML
  - Integration: Live import of a known PMID (e.g., 25539518) returns expected data

### Task 1.2.3 — RisImportService
- Implement `importRis(guidelineId, file)`:
  - Parse .ris file format (tag-value pairs: TY, TI, AU, PY, AB, DO, UR, etc.)
  - Support multiple references per file
  - Map RIS tags to Reference fields
  - Handle encoding issues (UTF-8, Latin-1)
  - Return count of imported references + any parsing errors
- **Quality gate**: Correctly parses RIS files from Endnote, Mendeley, Covidence
- **Tests**:
  - Unit: Parse sample RIS files with varying formats
  - Edge cases: missing fields, multiple authors, special characters

### Task 1.2.4 — DeduplicationService
- Implement `findDuplicates(guidelineId)`:
  - Exact match on DOI (case-insensitive)
  - Exact match on PubMed ID
  - Fuzzy match on title using pg_trgm similarity (threshold: 0.7)
  - Return groups of potential duplicates with similarity scores
- **Quality gate**: Identifies obvious duplicates (same DOI) and likely duplicates (similar titles)
- **Tests**:
  - Unit: Grouping logic with known duplicates
  - Integration: pg_trgm similarity query returns correct results

### Task 1.2.5 — Bulk Edit Lock Mechanism
- Implement `acquireLock(guidelineId, userId)`:
  - Store lock in Redis with 24-hour TTL: `bulk-edit-lock:{guidelineId}` → userId
  - Return 409 if lock already held by another user
  - Emit `reference.bulk-edit-lock` event
- Implement `releaseLock(guidelineId, userId)`:
  - Only lock holder or guideline admin can release
  - Delete Redis key
- Implement lock check middleware:
  - On section/reference structural operations (create, delete, reorder), check if bulk edit lock is held by a different user
  - If locked, return 423 Locked with lock holder info
- **Quality gate**: Lock prevents structural changes by other users; expires after 24h
- **Tests**:
  - Unit: Lock acquisition, release, expiry, admin override
  - Integration: Concurrent requests from different users respect lock

### Task 1.2.6 — ReferenceController (REST Endpoints)
- Implement all reference management endpoints:
  - `GET /api/v1/guidelines/:id/references` — list with "places used" counts
  - `POST /api/v1/guidelines/:id/references` — create (manual)
  - `POST /api/v1/guidelines/:id/references/pubmed` — import by PubMed ID
  - `POST /api/v1/guidelines/:id/references/ris` — import RIS file
  - `PUT /api/v1/references/:id` — update
  - `DELETE /api/v1/references/:id` — soft delete (blocked if "in use")
  - `POST /api/v1/guidelines/:id/references/bulk-edit/lock` — acquire lock
  - `DELETE /api/v1/guidelines/:id/references/bulk-edit/lock` — release lock
  - `GET /api/v1/guidelines/:id/references/duplicates` — deduplication checker
- Apply `@Roles()`: Create/update/delete = ADMIN, AUTHOR; Read = all authenticated
- Add file upload handling for RIS import (multipart/form-data, validate .ris extension)
- **Quality gate**: All endpoints work with correct auth, validation, and error responses
- **Tests**: E2E tests for each endpoint

### Task 1.2.7 — ReferenceFhirProjection (Citation Resource)
- Create `ReferenceFhirProjectionService`:
  - `toCitation(reference): Citation` — maps Reference to FHIR R5 Citation
    - `title` → Citation.title
    - `citedArtifact.title` → title
    - `citedArtifact.abstract` → abstract
    - `citedArtifact.publicationForm.publishedIn` → journal/year info
    - `citedArtifact.contributorship.entry[]` → authors
    - `citedArtifact.webLocation[]` → DOI, PubMed URL
- **Quality gate**: Output validates against FHIR R5 Citation StructureDefinition
- **Test**: Unit test — sample reference produces valid Citation JSON

### Task 1.2.8 — Reference Auto-Numbering Service
- Implement `computeReferenceNumbers(guidelineId)`:
  - Depth-first traversal of the section tree
  - Collect reference IDs in order of first appearance
  - Assign sequential numbers (1, 2, 3, ...)
  - Return map of referenceId → displayNumber
- This is computed on-read (not stored) to ensure consistency when sections are reordered
- **Quality gate**: Reference numbers update correctly when sections are reordered
- **Tests**:
  - Unit: DFS traversal with known section tree produces expected numbering
  - Integration: Reorder sections, verify reference numbers change correctly

---

## 1.3 Basic Recommendation Module — Backend (subset of `@app/recommendation-etd`)

### Task 1.3.1 — RecommendationService (Basic CRUD)
- Implement `create(guidelineId, dto, userId)`:
  - Create Recommendation with defaults (strength=NOT_SET, type=GRADE, recStatus=NEW)
  - Initialize `fhirMeta`
  - Emit `recommendation.created` event
- Implement `findAll(guidelineId)`:
  - Return recommendations with section placements, linked PICO count
  - Order by section placement ordering
- Implement `findOne(id)`:
  - Return recommendation with all sub-tab data (EtD factors, linked PICOs, EMR elements, comments)
- Implement `update(id, dto)`:
  - Update strength, recommendationType, description (TipTap JSON), header, remark, rationale, practicalInfo
  - If strength changed, emit `recommendation.strength-changed` event
  - Update recStatus, recStatusDate, recStatusComment
  - Update certaintyOfEvidence
- Implement `softDelete(id)`:
  - Soft delete, emit event
- Implement `linkToSection(recommendationId, sectionId, ordering)`:
  - Create SectionRecommendation join record
- Implement `unlinkFromSection(recommendationId, sectionId)`:
  - Remove SectionRecommendation join record
- **Quality gate**: Full CRUD with section linking
- **Tests**:
  - Unit: Strength change emits event; defaults set correctly
  - Integration: Section linking creates correct join records
  - E2E: Create recommendation → link to section → verify appears in section tree

### Task 1.3.2 — RecommendationController (Basic REST Endpoints)
- Implement Phase 1 recommendation endpoints:
  - `GET /api/v1/guidelines/:id/recommendations` — list all
  - `POST /api/v1/guidelines/:id/recommendations` — create
  - `GET /api/v1/recommendations/:id` — get with all sub-tabs
  - `PUT /api/v1/recommendations/:id` — update
  - `DELETE /api/v1/recommendations/:id` — soft delete
- Apply `@Roles()`: Create/update/delete = ADMIN, AUTHOR; Read = all authenticated
- Request validation DTOs
- **Quality gate**: Endpoints return correct responses with proper auth
- **Tests**: E2E tests for each endpoint

### Task 1.3.3 — RecommendationFhirProjection (PlanDefinition Resource)
- Create `RecommendationFhirProjectionService`:
  - `toPlanDefinition(recommendation): PlanDefinition` — maps to FHIR R5 PlanDefinition
    - `status` → maps to PlanDefinition.status
    - `title` → PlanDefinition.title
    - `description` → PlanDefinition.description (TipTap → plain text)
    - `type` → eca-rule CodeableConcept
    - `action[]` → single action with strength/direction as extensions
    - `useContext[]` → built from linked PICO codes (when available)
    - `relatedArtifact[]` → references to linked Evidence and Citation resources
    - Extensions for GRADE strength, certainty, recommendation type
    - `meta` → from recommendation.fhirMeta
    - Profile: CPGRecommendationDefinition
- **Quality gate**: Output validates against FHIR R5 PlanDefinition + CPG profile
- **Test**: Unit test — sample recommendation with strength + linked PICO produces valid PlanDefinition

---

## 1.4 Collaboration Module — Backend (Phase 1 subset of `@app/collaboration`)

### Task 1.4.1 — PermissionService (CRUD)
- Implement `addMember(guidelineId, userId, role)`:
  - Create GuidelinePermission record
  - Validate: no duplicate [guidelineId, userId] pairs
  - Emit `permission.changed` event
- Implement `updateRole(permissionId, newRole)`:
  - Update role field
  - Business rule: cannot remove the last ADMIN from a guideline
  - Emit `permission.changed` event
- Implement `removeMember(permissionId)`:
  - Delete GuidelinePermission record
  - Business rule: cannot remove the last ADMIN
  - Emit `permission.changed` event
- Implement `getMembers(guidelineId)`:
  - Return all permissions with user details (displayName, email)
  - Include role information
- **Quality gate**: Permission CRUD maintains last-admin invariant
- **Tests**:
  - Unit: Cannot remove last admin; duplicate membership prevented
  - Integration: Permission changes reflected in RBAC guard behavior
  - E2E: Add member → change role → verify access via protected endpoint

### Task 1.4.2 — ActivityLogService (Query Interface)
- Implement `getActivityLog(guidelineId, filters)`:
  - Paginated query with filters: userId, entityType, entityId, actionType, dateRange, isFlagged
  - Full-text search on entityTitle and comment fields
  - Return with user display names
  - Sort by timestamp DESC
- Implement `flagEntry(entryId)`:
  - Toggle `isFlagged` on ActivityLogEntry
- Implement `addComment(entryId, comment)`:
  - Update `comment` field on ActivityLogEntry
- Note: Activity log ENTRIES are created by AuditInterceptor (Task 0.4.3), not by this service
- **Quality gate**: Efficient querying with composite index; filter combinations work
- **Tests**:
  - Unit: Filter logic produces correct Prisma where clauses
  - Integration: Activity entries created by interceptor are queryable here

### Task 1.4.3 — CollaborationController (Phase 1 Endpoints)
- Implement Phase 1 collaboration endpoints:
  - `GET /api/v1/guidelines/:id/permissions` — list all members + roles
  - `POST /api/v1/guidelines/:id/permissions` — add member (ADMIN only)
  - `PUT /api/v1/permissions/:id` — change role (ADMIN only)
  - `DELETE /api/v1/permissions/:id` — remove member (ADMIN only)
  - `GET /api/v1/guidelines/:id/activity` — activity log (paginated, filterable)
  - `POST /api/v1/activity/:id/flag` — flag for follow-up
  - `POST /api/v1/activity/:id/comment` — add comment to log entry
- Apply appropriate `@Roles()` decorators
- **Quality gate**: Permission management is admin-only; activity log is viewable by all members
- **Tests**: E2E tests including role-based access enforcement

---

## 1.5 Publishing Module — Backend (Phase 1 subset of `@app/publishing`)

### Task 1.5.1 — VersionService (Snapshot Creation)
- Implement `publish(guidelineId, dto, userId)`:
  - Validate: guideline is not a Personal type OR is an Evidence Summary
  - Accept `versionType` (MAJOR/MINOR) and `comment`
  - Calculate next version number:
    - If no previous versions: v1.0 (major) or v0.1 (minor)
    - Increment major or minor from last version
  - Create immutable FHIR Bundle snapshot:
    - Assemble document Bundle containing: Composition (guideline), all PlanDefinitions (recommendations), all Evidence (PICOs — if they exist), all Citations (references), Organization, Practitioner resources
    - Store as JSON in `snapshotBundle` column
  - Mark previous published version as OUT_OF_DATE (update guideline status context)
  - Auto-create new DRAFT from current state
  - Queue PDF generation job (Bull queue)
  - Queue JSON export job (Bull queue)
  - Emit `version.published` event
- Implement `findVersions(guidelineId)`:
  - Return version history with: versionNumber, publishedAt, publishedBy (user name), comment, isPublic, pdfS3Key, jsonS3Key
- Implement `getVersion(versionId)`:
  - Return version with snapshotBundle (for viewing published content)
- **Quality gate**: Published versions are truly immutable; version numbers increment correctly
- **Tests**:
  - Unit: Version number calculation (edge cases: first publish, sequential major/minor)
  - Integration: FHIR Bundle contains all expected resources
  - E2E: Publish → verify version in history → verify FHIR Bundle content

### Task 1.5.2 — PdfGeneratorService (Basic)
- Implement PDF generation using Puppeteer/Playwright:
  - Render guideline content as HTML (server-side template)
  - Apply PDF styling (1 or 2 column layout, based on guideline settings)
  - Include: title page (with cover page if uploaded), table of contents, section content, recommendations with strength badges, reference list
  - Generate PDF via headless Chrome
  - Upload to S3 with key `pdf-snapshots/{guidelineId}/{versionNumber}.pdf`
  - Update `pdfS3Key` on GuidelineVersion record
- Process via Bull queue (worker service) to avoid blocking API
- **Quality gate**: PDF renders correctly with section structure, recommendation formatting
- **Tests**:
  - Unit: HTML template generation produces expected structure
  - Integration: PDF generation produces a valid PDF file of reasonable size

### Task 1.5.3 — PublishingController (Phase 1 Endpoints)
- Implement Phase 1 publishing endpoints:
  - `GET /api/v1/guidelines/:id/versions` — version history
  - `POST /api/v1/guidelines/:id/versions` — publish new version (ADMIN only)
  - `GET /api/v1/versions/:id` — get version snapshot
  - `GET /api/v1/versions/:id/pdf` — download PDF (signed S3 URL)
  - `GET /api/v1/versions/:id/json` — download JSON export
  - `PUT /api/v1/guidelines/:id/public` — toggle public access (ADMIN only)
- **Quality gate**: Only admins can publish; PDF/JSON downloads work via pre-signed URLs
- **Tests**: E2E tests for publish flow, download endpoints

---

## 1.6 Frontend — Application Shell

### Task 1.6.1 — Root Layout & Navigation
- Implement `__root.tsx` with:
  - **Top Bar**: Logo (placeholder), Guideline Title (from route context), Version Badge, User Menu (dropdown with profile, logout)
  - **Side Nav**: Collapsible panel for section tree (content loaded per-guideline)
  - **Tab Bar**: Recommendations, Evidence, References tabs
  - **Status Bar**: Last saved timestamp, Online/Offline indicator
- Configure TanStack Router navigation between tabs
- Implement responsive breakpoints (desktop-first, collapse sidebar on mobile)
- **Quality gate**: Shell renders at all viewport sizes; navigation between routes works
- **Test**: Visual regression test snapshots for desktop and mobile layouts

### Task 1.6.2 — Auth Integration (Keycloak)
- Implement `useAuth` hook:
  - Initialize Keycloak JS adapter
  - Handle OIDC PKCE flow (login, logout, token refresh)
  - Store access token in memory (not localStorage)
  - Auto-refresh token before expiry
- Configure Axios API client (`api-client.ts`):
  - Set base URL from env
  - Add auth interceptor: attach Bearer token to all requests
  - Handle 401 responses: trigger token refresh, retry request
- Implement `usePermissions` hook:
  - Fetch current user's role for the active guideline
  - Expose `canEdit`, `canPublish`, `canManagePermissions` booleans
- Implement protected route wrapper:
  - Redirect to Keycloak login if not authenticated
  - Show 403 page if no permission for current guideline
- **Quality gate**: Login → access guideline → token refresh → logout flow works
- **Test**: Auth flow integration test with Keycloak test realm

### Task 1.6.3 — Dashboard Page (`routes/index.tsx`)
- Implement guideline dashboard:
  - List user's guidelines with: title, status badge, org name, last edited, recommendation count, PICO count
  - "Create Guideline" button → opens creation dialog
  - Filter by organization
  - Search by title
- Implement `useGuidelines()` TanStack Query hook:
  - Fetches `GET /api/v1/guidelines`
  - Caches with 30s stale time
- **Quality gate**: Dashboard loads guidelines, clicking one navigates to guideline view
- **Test**: Renders empty state correctly; renders guideline cards with correct data

### Task 1.6.4 — Guideline Creation Dialog
- Implement creation form with React Hook Form + Zod:
  - Title (required)
  - Organization (dropdown of user's orgs)
  - Guideline type (Organizational/Personal/Evidence Summary)
  - Language (15 options)
  - Description (optional)
- On submit: `POST /api/v1/guidelines` → navigate to new guideline
- **Quality gate**: Form validation works; submission creates guideline and navigates
- **Test**: Validation errors display correctly; successful creation navigates

---

## 1.7 Frontend — Guideline Authoring Features

### Task 1.7.1 — Section Tree Component (`SectionTree.tsx`)
- Implement recursive, drag-and-drop section tree:
  - Use `dnd-kit` for drag and drop
  - Render nested sections with indentation (max 3 levels)
  - Each node shows: section number (if numbered), title, linked content counts (references, PICOs, recs)
  - Click to select → loads section editor in content area
  - "[+] Add Section" button at each level
  - Context menu: Rename, Add Sub-section, Delete, Exclude from Numbering
- Implement `useSections()` TanStack Query hook
- On drag-end: call `PUT /api/v1/guidelines/:id/sections/reorder` with new order
- **Quality gate**: Drag-and-drop reorders sections; nested sections render correctly; auto-numbering updates
- **Tests**:
  - Renders 3-level nested tree correctly
  - Drag-drop calls reorder API with correct payload
  - Section numbers update after reorder

### Task 1.7.2 — Section Editor (`SectionEditor.tsx`)
- Implement TipTap rich text editor for section text:
  - Use `RichTextEditor` shared component (see Task 1.8.1)
  - Display section title (editable)
  - Display section text editor
  - Save on blur or debounced (500ms) auto-save
  - Show "Saved" / "Saving..." / "Unsaved changes" in status bar
- Implement `useSectionMutation()` for optimistic updates via TanStack Query
- **Quality gate**: Rich text edits save reliably; auto-save doesn't lose data
- **Test**: Edit text → verify API called with correct TipTap JSON; optimistic update shows immediately

### Task 1.7.3 — Guideline Settings Form (`GuidelineSettingsForm.tsx`)
- Implement settings page with 10 tabs (Phase 1 implements subset):
  - **General**: Title, description, disclaimer, funding, contact, language, start date
  - **Customization**: Show section numbers, show GRADE strength description, EtD mode (4/7 factor), custom colors
  - **Permissions**: (see Task 1.7.8)
  - **Publishing**: (see Task 1.7.10)
  - Remaining tabs (COI, Milestones, Voting, Tags, Word Export, PDF Export): placeholder "Coming in Phase 2/4"
- Use React Hook Form with Zod validation per tab
- Auto-save on field blur
- **Quality gate**: Settings save correctly; tab navigation preserves unsaved state
- **Test**: Change settings → verify API call → refresh → verify persistence

### Task 1.7.4 — Reference List Page (`ReferenceList.tsx`)
- Implement sortable, searchable reference table:
  - Columns: #, Title, Authors, Year, Study Type, Places Used, Actions
  - Sorting on each column via TanStack Table
  - Full-text search input
  - Reference numbers computed from section tree order
  - Row click → opens reference detail editor
  - "Add Reference" button → opens form (Task 1.7.5)
  - "Import from PubMed" button → opens dialog (Task 1.7.6)
  - "Import RIS" button → file upload
  - "Find Duplicates" button → opens deduplication view
- Implement `useReferences()` TanStack Query hook
- **Quality gate**: Table sorts, searches, and displays reference numbers correctly
- **Test**: Search filters references; sort order persists; "places used" counts are accurate

### Task 1.7.5 — Reference Form (`ReferenceForm.tsx`)
- Implement manual reference entry/edit form:
  - Fields: Title, Authors, Year, Abstract, PubMed ID, DOI, URL, Study Type
  - Validation: PubMed ID format (8 digits), DOI format
  - "Look up" button for PubMed ID → auto-fills other fields
  - File attachment section (upload PDFs, images — visible to admin/author only)
- **Quality gate**: Form validates correctly; PubMed lookup auto-fills
- **Test**: Enter PubMed ID → click lookup → verify fields populated

### Task 1.7.6 — PubMed Import Dialog
- Implement import by PubMed ID:
  - Text input for PubMed ID (or paste PubMed URL → extract ID)
  - "Import" button → calls `POST /api/v1/guidelines/:id/references/pubmed`
  - Shows preview of imported reference before confirming
  - Handles errors: invalid ID, already exists (dedup check)
- **Quality gate**: Import creates reference with correct data
- **Test**: Import known PMID → verify reference created with expected fields

### Task 1.7.7 — Basic Recommendation Editor (`RecommendationEditor.tsx`)
- Implement recommendation editing panel:
  - **Strength selector**: Visual picker for Strong For / Conditional For / Conditional Against / Strong Against / Not Set + non-GRADE types (Practice Statement, etc.)
  - **Strength Badge**: Color-coded display matching the example SPA pattern
  - **Recommendation text**: TipTap editor for the recommendation statement (blue-tinted callout box)
  - **Header**: Optional short navigation text
  - **Remark**: Optional critical info (grey callout box)
  - **Rationale**: TipTap editor
  - **Practical Info**: TipTap editor
  - **Status**: Dropdown (New, Updated, In Review, etc.) with date and comment fields
  - **Certainty of Evidence**: Dropdown (High, Moderate, Low, Very Low)
  - **Section placement**: Dropdown to link/unlink from sections
- Display as sub-tabs within the recommendation: Recommendation, Rationale, Practical Info
- **Quality gate**: All recommendation fields save correctly; strength badge renders with correct colors
- **Test**: Set strength → verify badge color; edit recommendation text → verify saves as TipTap JSON

### Task 1.7.8 — Permission Management UI
- Implement member management panel (within Guideline Settings > Permissions):
  - Table of current members: Name, Email, Role (dropdown), Remove button
  - "Add Member" form: email input + role selector
  - Role change dropdown: Admin, Author, Reviewer, Viewer
  - Confirmation dialog for removing members
  - Warning when changing the last admin
- **Quality gate**: Role changes take effect immediately; last admin cannot be removed
- **Test**: Add member → verify access; change role → verify permissions change; attempt remove last admin → verify blocked

### Task 1.7.9 — Version History Page (`VersionHistory.tsx`)
- Implement version history display:
  - List of published versions: version number, date, publisher name, comment, status badge (Published/Out of Date/Public)
  - Download buttons: PDF, JSON
  - "View" button → opens version snapshot in read-only mode
  - Current draft indicator at top
- **Quality gate**: Version list shows correct statuses; downloads work
- **Test**: Publish → verify version appears in list with correct data; download PDF → verify file received

### Task 1.7.10 — Publish Dialog (`PublishDialog.tsx`)
- Implement publish flow:
  - Dialog with: Version type selector (Major/Minor), version number preview, comment text area
  - Shows what will be included (section count, recommendation count, reference count)
  - "Publish" button → `POST /api/v1/guidelines/:id/versions`
  - Loading state during publish
  - Success: close dialog, refresh version history, show toast
  - Public toggle (separate from publishing)
- **Quality gate**: Publish creates version with correct number; UI shows progress
- **Test**: Publish major → verify v1.0 created; publish minor → verify v1.1

---

## 1.8 Frontend — Shared Components

### Task 1.8.1 — RichTextEditor Component (`RichTextEditor.tsx`)
- Implement TipTap 3 wrapper component:
  - Toolbar: Bold, Italic, Underline, Heading (1-3), Bullet List, Ordered List, Link, Undo/Redo
  - Content stored as TipTap JSON (not HTML)
  - Controlled component: value/onChange interface compatible with React Hook Form
  - Placeholder text support
  - Read-only mode (for published content viewing)
  - Auto-resize height based on content
  - Citation link extension (placeholder — links to references, rendered as [1] with hover popover)
- **Note**: Track changes and comments deferred to Phase 2
- **Quality gate**: Editor produces valid TipTap JSON; all toolbar actions work
- **Test**: Type text → verify JSON output; toggle bold → verify marks in JSON

### Task 1.8.2 — StrengthBadge Component (`StrengthBadge.tsx`)
- Implement color-coded GRADE strength display:
  - `STRONG_FOR`: Green background, up arrow
  - `CONDITIONAL_FOR`: Yellow/amber background, up arrow
  - `CONDITIONAL_AGAINST`: Orange background, down arrow
  - `STRONG_AGAINST`: Red background, down arrow
  - `NOT_SET`: Grey background
  - Non-GRADE types: distinct styling per type (Practice Statement = purple, etc.)
- Support custom organization labels (e.g., "Weak" instead of "Conditional")
- **Quality gate**: All strength values render with correct colors and labels
- **Test**: Snapshot tests for each strength variant

### Task 1.8.3 — CertaintyBadge Component (`CertaintyBadge.tsx`)
- Implement GRADE certainty indicator:
  - `HIGH`: ⊕⊕⊕⊕ (4 filled circles)
  - `MODERATE`: ⊕⊕⊕◯ (3 filled, 1 empty)
  - `LOW`: ⊕⊕◯◯
  - `VERY_LOW`: ⊕◯◯◯
- Color-coded: High=green, Moderate=blue, Low=orange, Very Low=red
- **Quality gate**: Renders correctly for all 4 levels
- **Test**: Snapshot tests for each certainty level

### Task 1.8.4 — StatusLabel Component (`StatusLabel.tsx`)
- Implement recommendation status display:
  - Each status gets a color-coded badge: New (green), Updated (blue), In Review (yellow), Possibly Outdated (orange), Updated Evidence (teal), Reviewed (grey)
  - Shows date and comment if provided
- **Quality gate**: All 7 status values render correctly
- **Test**: Snapshot tests for each status variant

### Task 1.8.5 — MultilayerAccordion Component (`MultilayerAccordion.tsx`)
- Implement progressive disclosure pattern (matching the example SPA):
  - Layer 1: Summary card (collapsed state — shows title, strength badge, brief text)
  - Layer 2: Click to expand → shows full recommendation, rationale, key info
  - Layer 3: Click deeper → shows full evidence, EtD framework
- Use Radix Accordion primitive for accessibility
- Smooth open/close animations
- **Quality gate**: Three-layer progressive disclosure works; accessible via keyboard
- **Test**: Click through layers → verify correct content shown at each level

### Task 1.8.6 — API Client (`api-client.ts`)
- Implement Axios-based API client:
  - Base URL from environment variable
  - Auth interceptor (Bearer token from useAuth)
  - Response interceptor: handle 401 (token refresh), 403 (permission error toast), 422 (validation error display), 500 (generic error toast)
  - Request/response typing via shared DTOs
- Implement `useOptimisticUpdate` hook:
  - Wraps TanStack Query `useMutation` with optimistic update pattern
  - Rolls back on error
  - Shows toast on success/failure
- **Quality gate**: API calls include auth; errors are handled gracefully
- **Test**: Mock API responses → verify interceptors handle each error code correctly

---

## Phase 1 Summary

| Category | Count |
|----------|-------|
| Backend tasks | 18 |
| Frontend tasks | 16 |
| Total tasks | 34 |
| API endpoints implemented | ~40 |
| FHIR projections | 3 (Composition, Citation, PlanDefinition) |
| Shared components | 6 |
| NestJS services | ~12 |
| React feature components | ~10 |
