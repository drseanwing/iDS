# Phase 3 — Clinical Integration + FHIR (Weeks 17–22)

> **Dependencies**: Phase 1 + Phase 2 (all resource types must exist for FHIR projections)
> **Goal**: Clinical coding, EHR integration elements, FHIR facade API, embeddable widgets, public guideline viewer.
> **Deliverable**: Interoperable platform with FHIR API, clinical coding, and embeddable widgets.

---

## 3.1 Clinical Integration Module — Backend (`@app/clinical-integration`)

### Task 3.1.1 — CodingService (Terminology Lookup via BioPortal)
- Implement `search(codeSystem, term)`:
  - Proxy search to BioPortal REST API (`https://data.bioontology.org/search`)
  - Support code systems: SNOMED_CT, ICD10, ATC, RXNORM
  - Map BioPortal ontology IDs: `SNOMEDCT` → SNOMED_CT, `ICD10` → ICD10, `ATC` → ATC, `RXNORM` → RXNORM
  - Return results as standardized `CodeableConcept`-shaped objects: `{ system, code, display }`
  - Cache results in Redis with 24-hour TTL: key = `terminology:{system}:{term}`
  - Handle BioPortal API key configuration (via ConfigModule)
  - Handle rate limiting and error responses gracefully
  - Fallback: if BioPortal unavailable, try FHIR terminology service at `tx.fhir.org`
- **Quality gate**: Search returns relevant coded concepts; caching reduces API calls
- **Tests**:
  - Unit: Response mapping from BioPortal format to CodeableConcept
  - Integration: Live search for "diabetes" in SNOMED_CT returns expected results
  - Unit: Redis caching — second call returns cached result without API hit

### Task 3.1.2 — EmrElementService (EHR Integration Elements)
- Implement `create(recommendationId, dto)`:
  - Create EmrElement with: elementType (TARGET_POPULATION or INTERVENTION), codeSystem, code, display, implementationDescription
  - Validate code exists in the specified code system (optional — may accept user-entered codes)
  - Emit `emr-element.created` event
- Implement `findByRecommendation(recommendationId)`:
  - Return EMR elements grouped by elementType
- Implement `update(id, dto)`:
  - Update code, display, implementationDescription
- Implement `delete(id)`:
  - Hard delete (not soft delete — EMR elements are simple lookups)
- **Quality gate**: EMR elements correctly link coded concepts to recommendations
- **Tests**:
  - Unit: CRUD operations work; grouping by type correct
  - Integration: Create EMR element → verify appears in recommendation GET response

### Task 3.1.3 — ClinicalIntegrationController (REST Endpoints)
- Implement endpoints:
  - `GET /api/v1/codes/search?system=SNOMED_CT&term=diabetes` — terminology lookup (BioPortal proxy)
  - `POST /api/v1/recommendations/:id/emr-elements` — add EMR element
  - `PUT /api/v1/emr-elements/:id` — update
  - `DELETE /api/v1/emr-elements/:id` — remove
- Apply `@Roles()`: Mutations = ADMIN, AUTHOR; Code search = all authenticated
- **Quality gate**: Endpoints work with correct auth
- **Tests**: E2E tests for terminology search and EMR element CRUD

---

## 3.2 FHIR Facade Module — Backend (`@app/fhir-facade`)

### Task 3.2.1 — ConformanceService (CapabilityStatement)
- Implement `getCapabilityStatement()`:
  - Generate FHIR R5 CapabilityStatement resource describing:
    - Server name: "OpenGRADE FHIR Facade"
    - FHIR version: 5.0.0
    - Supported resources: PlanDefinition, Evidence, EvidenceVariable, Citation, ArtifactAssessment, Composition, Bundle, AuditEvent, Organization, Practitioner
    - Supported interactions per resource: read, search-type
    - Search parameters per resource (e.g., PlanDefinition: `topic`, `status`, `title`)
    - Supported profiles: CPGRecommendationDefinition, CertaintyOfEvidence, RecommendationJustification
    - Content-Type: `application/fhir+json`
  - Return as static resource (regenerate on server startup)
- **Quality gate**: CapabilityStatement validates against FHIR R5 CapabilityStatement StructureDefinition
- **Test**: Unit test — output contains all expected resource entries and search parameters

### Task 3.2.2 — FhirSearchParser (Query Translation)
- Implement FHIR search parameter to Prisma query translation:
  - `_id` → Prisma `where: { id }`
  - `status` → Prisma `where: { status }`
  - `title:contains` → Prisma `where: { title: { contains } }`
  - `topic` (CodeableConcept) → join through PicoCode table
  - `date` → Prisma date range filters
  - `_count` → Prisma `take`
  - `_offset` → Prisma `skip`
  - `_include` → Prisma `include` (resolve related resources)
  - `_revinclude` → reverse includes
  - `_sort` → Prisma `orderBy`
- Handle FHIR composite search parameters
- Return Prisma query object ready for execution
- **Quality gate**: All standard FHIR search modifiers translate correctly
- **Tests**:
  - Unit: Each search parameter type produces correct Prisma query
  - Edge cases: Missing params, invalid values, combined params

### Task 3.2.3 — FhirBundleService (Search Result Assembly)
- Implement `buildSearchBundle(resources, total, searchParams)`:
  - Assemble FHIR Bundle with `type: searchset`
  - Include `total` count
  - Include `link[]` for pagination: self, next, previous
  - Each entry: `fullUrl`, `resource`, `search.mode: match`
  - Include `_include`d resources with `search.mode: include`
- Implement `buildDocumentBundle(guideline, version)`:
  - Assemble FHIR Bundle with `type: document`
  - First entry: Composition resource
  - Subsequent entries: all referenced resources (PlanDefinitions, Evidence, Citations, etc.)
  - Self-contained (no external references)
- **Quality gate**: Bundles validate against FHIR R5 Bundle StructureDefinition
- **Tests**:
  - Unit: Search bundle with pagination links
  - Unit: Document bundle contains all expected resources

### Task 3.2.4 — FhirController (Read-Only Endpoints)
- Implement all FHIR facade endpoints:
  - `GET /fhir/metadata` — CapabilityStatement
  - `GET /fhir/PlanDefinition/:id` — single recommendation
  - `GET /fhir/PlanDefinition?topic=:code&status=active` — search by clinical code
  - `GET /fhir/Evidence/:id` — single evidence profile
  - `GET /fhir/EvidenceVariable/:id` — single PICO element
  - `GET /fhir/Citation/:id` — single reference
  - `GET /fhir/ArtifactAssessment/:id` — GRADE/EtD assessment
  - `GET /fhir/Composition/:id` — guideline as Composition
  - `GET /fhir/Bundle/:versionId` — published version as document Bundle
  - `GET /fhir/AuditEvent?entity=:id` — activity log for entity
  - `GET /fhir/Organization/:id` — organization
  - `GET /fhir/Practitioner/:id` — user/panel member
- Set Content-Type: `application/fhir+json` on all responses
- Support `_format` parameter (json only for Phase 3)
- Support `_include` and `_revinclude` for fetching related resources
- Handle FHIR-style errors: OperationOutcome responses for 404, 400, 500
- Mark all endpoints as `@Public()` (FHIR endpoints are unauthenticated for published content, auth-required for draft content)
- **Quality gate**: All endpoints return valid FHIR resources; error responses use OperationOutcome
- **Tests**:
  - E2E: Fetch each resource type by ID → verify valid FHIR JSON
  - E2E: Search PlanDefinition by topic → verify search Bundle
  - E2E: Fetch non-existent resource → verify OperationOutcome 404
  - E2E: Fetch Bundle for published version → verify document Bundle completeness

### Task 3.2.5 — FHIR Facade Access Control
- Implement access control logic for FHIR endpoints:
  - Published + Public guidelines: all resources accessible without auth
  - Published + Internal guidelines: require auth + GuidelinePermission
  - Draft guidelines: require auth + GuidelinePermission with ADMIN or AUTHOR role
  - Filter search results based on user permissions (authenticated) or public status (unauthenticated)
- **Quality gate**: Public content accessible without auth; private content requires correct permissions
- **Tests**:
  - E2E: Unauthenticated request to public guideline resources → 200
  - E2E: Unauthenticated request to private guideline resources → 401
  - E2E: Authenticated request without permission → 403

---

## 3.3 Publishing Module Expansion — Backend (`@app/publishing`)

### Task 3.3.1 — WidgetService (Embeddable Widget URLs)
- Implement `getWidgetConfig(guidelineId, entityType, entityId)`:
  - Generate widget embed configuration:
    - Widget URL with query parameters: guidelineId, entityType (recommendation/pico), entityId, shortName
    - Configurable options: width, height, open/closed initial state, forced language, pinned version vs. latest
  - Generate embed code snippets:
    - `<iframe>` embed (standard)
    - `<script>` embed (for dynamic loading of widget bundle)
    - Pop-up mode (link that opens widget in new window)
  - Return JSON with all configuration and embed code
- Implement widget serving endpoint:
  - Serve widget HTML that loads the Preact widget bundle
  - Pass configuration via URL parameters
  - Widget auto-updates to latest version unless pinned
- **Quality gate**: Widget embeds load correctly in iframe; configuration options work
- **Tests**:
  - Unit: Embed code generation produces valid HTML/JS
  - Integration: Widget iframe loads and displays recommendation data
  - E2E: Embed widget on test page → verify renders correctly

### Task 3.3.2 — SubscriptionService (Email Notifications)
- Implement subscriber management:
  - `subscribe(guidelineId, email)` — add to subscriber list
  - `unsubscribe(guidelineId, email)` — remove from subscriber list
  - `getSubscribers(guidelineId)` — list all subscribers
- Implement notification broadcasting:
  - `broadcastUpdate(guidelineId, message)` — send email to all subscribers
  - Queue via Bull to avoid blocking
  - Email template: guideline title, version info, custom message from admin, link to guideline
  - Unsubscribe link in every email
- Configure email transport (SMTP via ConfigModule)
- **Quality gate**: Emails delivered to subscribers; unsubscribe works
- **Tests**:
  - Unit: Email template rendering
  - Integration: Queue processing delivers to mock SMTP

### Task 3.3.3 — Publishing Controller Expansion
- Add to existing PublishingController:
  - `GET /api/v1/guidelines/:id/subscribers` — list subscribers (ADMIN only)
  - `POST /api/v1/guidelines/:id/subscribers/notify` — broadcast notification (ADMIN only)
  - `GET /api/v1/guidelines/:id/widgets/recommendation/:recId` — widget embed config
  - `GET /api/v1/guidelines/:id/widgets/pico/:picoId` — widget embed config
- **Quality gate**: All endpoints work with correct auth
- **Tests**: E2E tests for subscription and widget endpoints

### Task 3.3.4 — WordExportService (DOCX Generation)
- Implement `exportGuideline(guidelineId)`:
  - Generate Word document using `docx-js`:
    - Title page (with cover image if uploaded)
    - Table of contents (auto-generated from section structure)
    - Section content with rich text formatting (from TipTap JSON → DOCX)
    - Recommendations with strength badges (as colored text/shapes)
    - Summary of Findings tables (per PICO)
    - Reference list (auto-numbered)
    - PICO display: inline or annex (based on guideline settings)
    - Layout: 1 or 2 columns (based on settings)
    - Optional: track changes visible (based on settings)
  - Upload to S3 and return download URL
- Implement `exportPico(picoId)`:
  - Generate SoF table as standalone Word document
- **Quality gate**: Word doc renders correctly in MS Word and LibreOffice
- **Tests**:
  - Unit: TipTap JSON → DOCX conversion produces valid XML
  - Integration: Full guideline export generates openable DOCX
  - E2E: Export → download → verify file opens

---

## 3.4 Frontend — Clinical Integration Features

### Task 3.4.1 — Code Autocomplete Component (`CodeAutocomplete.tsx`)
- Implement terminology search widget:
  - Input field with debounced search (300ms)
  - Dropdown showing results from BioPortal: code, display text, code system icon
  - Minimum 2 characters to trigger search
  - Loading state during search
  - Code system selector: SNOMED CT, ICD-10, ATC, RxNorm
  - Selected code displayed as a chip/tag with remove button
  - Multiple code selection support
- Use `useCodes()` TanStack Query hook with search term as key
- **Quality gate**: Search returns relevant results within 1 second; selection creates PicoCode/EmrElement
- **Tests**:
  - Type "diabetes" → verify dropdown shows SNOMED CT results
  - Select code → verify chip created
  - Remove code → verify chip removed

### Task 3.4.2 — EMR Element Editor (`EmrElementEditor.tsx`)
- Implement EHR integration panel within recommendation:
  - **Target Population** section:
    - CodeAutocomplete for conditions (SNOMED CT, ICD-10)
    - Each code entry has an implementation description field
  - **Intervention** section:
    - CodeAutocomplete for actions/drugs (ATC, RxNorm, SNOMED CT)
    - Each code entry has an implementation description field
  - Display as two-column layout (Target Population | Intervention)
  - Preview: "When a patient has [codes], recommend [intervention codes]"
- **Quality gate**: EMR elements save correctly; preview shows meaningful clinical context
- **Test**: Add target population code + intervention code → verify saved; preview renders correctly

### Task 3.4.3 — FHIR Resource Viewer (`FhirResourceViewer.tsx`)
- Implement debugging/inspection tool for FHIR resources:
  - JSON tree viewer with syntax highlighting
  - Collapsible nested objects
  - Resource type badge at top
  - Copy-to-clipboard button
  - Download as JSON button
  - Validate button → checks against FHIR StructureDefinition (basic schema validation)
  - Tab to switch between: Guideline (Composition), Recommendations (PlanDefinition[]), Evidence (Evidence[]), References (Citation[])
- Accessible from guideline settings or a developer tools panel
- **Quality gate**: Renders valid JSON; collapsing/expanding works on deep objects
- **Test**: Fetch FHIR resource → render in viewer → verify tree navigation works

### Task 3.4.4 — Widget Configurator (`WidgetConfigurator.tsx`)
- Implement embed code generator:
  - Select entity: recommendation or PICO (dropdown)
  - Configuration options:
    - Display mode: embedded (inline), pop-up (new window), separate window
    - Width and height (pixels or responsive)
    - Initial state: open or closed
    - Language override (from 15 supported languages)
    - Version pinning: latest (auto-update) or specific version
  - Live preview iframe showing the widget
  - Copy embed code buttons: iframe code, script tag code
  - Share URL generation
- **Quality gate**: Generated embed codes work when pasted into external HTML
- **Test**: Configure widget → copy embed code → paste into test page → verify renders

### Task 3.4.5 — Public Guideline Viewer (`public/$shortName.tsx`)
- Implement the multilayer public reader view (similar to example_spa.html):
  - **Page structure**:
    - Hero section with guideline title, status badges, recommendation count
    - Filter bar: condition tags, topic tags, text search
    - Recommendation card grid (responsive, `repeat(auto-fill, minmax(340px, 1fr))`)
  - **Recommendation cards**:
    - Category label, title, strength indicator (circular badge)
    - Truncated recommendation text
    - Tags, last updated date
    - Click → opens detail modal
  - **Detail modal** (5 tabs):
    1. Recommendation: Strength badge, recommendation box (blue callout), remark, rationale, living update entries
    2. Evidence to Decision: Collapsible domain cards (per EtD factor), rating badges
    3. Practical Info: Structured content from recommendation
    4. Data: PICO display, evidence summary links
    5. More Info: Panel members, meeting date, related publications
  - **Features**:
    - Deep linking via hash-based URLs: `#rec-{id}` and human-readable slugs
    - Responsive layout (desktop, tablet, mobile breakpoints)
    - Open Graph / social media meta tags
    - Schema.org MedicalGuideline structured data (for SEO)
    - "Suggest feedback" link (if public comments enabled)
    - Version badge with link to version history
  - Unauthenticated access for public guidelines
  - Authenticated access required for published-internal guidelines
- **Quality gate**: Public viewer matches the design patterns from example_spa.html; accessible; responsive
- **Tests**:
  - Render with sample guideline data → verify card grid, modal navigation, filtering
  - Deep link to specific recommendation → verify modal opens
  - Mobile viewport → verify responsive layout
  - SEO: verify meta tags and structured data in HTML

### Task 3.4.6 — FHIR Export Hook (`useFhirExport.ts`)
- Implement TanStack Query hook for FHIR data access:
  - `useFhirExport(guidelineId)` — fetches FHIR Bundle for current version
  - Trigger download as `.json` file with FHIR-compliant filename
  - Loading state during Bundle assembly
  - Error handling for large guidelines
- **Quality gate**: Downloaded JSON is a valid FHIR R5 document Bundle
- **Test**: Click export → verify file downloaded → parse JSON → verify Bundle structure

---

## 3.5 Widget Package (`packages/widget`)

### Task 3.5.1 — RecommendationWidget (Preact)
- Implement standalone embeddable recommendation widget:
  - Fetches recommendation data via FHIR API (PlanDefinition)
  - Displays: title, strength badge, recommendation text, certainty badge
  - Expandable: click to show rationale, practical info
  - Multilayer progressive disclosure
  - Configurable: language, initial state, styling
  - Bundle size target: < 50KB gzipped
- Build in library mode via Vite (UMD + ESM outputs)
- Self-contained styles (CSS-in-JS or scoped CSS to avoid conflicts)
- **Quality gate**: Widget renders correctly when embedded in external HTML; bundle < 50KB
- **Tests**:
  - Unit: Widget renders with mock data
  - Integration: Embedded in iframe → fetches from FHIR API → renders
  - Bundle size: verify < 50KB gzipped

### Task 3.5.2 — PicoWidget (Preact)
- Implement standalone embeddable PICO/SoF table widget:
  - Fetches evidence data via FHIR API (Evidence + EvidenceVariable)
  - Displays: PICO question, Summary of Findings table (simplified)
  - Expandable outcomes with GRADE assessment
  - Same configuration options as recommendation widget
- **Quality gate**: Widget renders SoF table correctly; bundle < 50KB
- **Test**: Widget renders with sample PICO data; table displays correctly

### Task 3.5.3 — DecisionAidWidget (Preact)
- Implement standalone embeddable decision aid widget:
  - Fetches decision aid data via internal API
  - Three-layer display: overview → pictographs → full evidence
  - Practical issues display
  - Patient-friendly labels
  - Interactive: click through layers
- **Quality gate**: Widget renders layered decision aid; bundle < 50KB
- **Test**: Widget renders with sample data; layer navigation works

---

## Phase 3 Summary

| Category | Count |
|----------|-------|
| Backend tasks | 12 |
| Frontend tasks | 9 |
| Total tasks | 21 |
| FHIR facade endpoints | 11 |
| Widget components | 3 |
| Export formats added | 1 (Word/DOCX) |
| External integrations | 2 (BioPortal, SMTP) |
