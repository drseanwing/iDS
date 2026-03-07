# Phase 2 — GRADE Evidence Engine (Weeks 9–16)

> **Dependencies**: Phase 1 (guideline, section, reference, basic recommendation infrastructure)
> **Goal**: Full GRADE evidence assessment workflow — PICO questions, outcomes, SoF tables, quality assessment, RevMan import, EtD framework, decision aids, track changes.
> **Deliverable**: Complete evidence-to-recommendation pipeline matching MAGICapp's core GRADE workflow.

---

## 2.1 GRADE Evidence Module — Backend (`@app/grade-evidence`)

### Task 2.1.1 — PicoService (CRUD)
- Implement `create(guidelineId, dto)`:
  - Create Pico with population, intervention, comparator (all text)
  - Initialize `fhirMeta`
  - Auto-create default section placement if section specified
  - Emit `pico.created` event
- Implement `findAll(guidelineId)`:
  - Return PICOs with: outcome count, linked recommendation count, section placements, code count
  - Filter by section, search by P/I/C text
- Implement `findOne(id)`:
  - Return PICO with all nested data: outcomes (ordered by type then ordering), codes, practical issues, section placements, recommendation links
- Implement `update(id, dto)`:
  - Update population, intervention, comparator, narrativeSummary (TipTap JSON)
  - Emit `pico.updated` event
- Implement `softDelete(id)`:
  - Soft delete PICO and cascade to outcomes, codes, practical issues
  - Emit `pico.deleted` event
- Implement `linkToSection(picoId, sectionId, ordering)`:
  - Create SectionPico join record
- Implement `linkToRecommendation(picoId, recommendationId)`:
  - Create PicoRecommendation join record
  - Trigger EtD factor refresh on the recommendation (auto-populate intervention labels)
- **Quality gate**: PICO CRUD with section and recommendation linking works
- **Tests**:
  - Unit: Cascade soft-delete covers outcomes, codes, issues
  - Integration: PICO-Recommendation linking triggers EtD refresh
  - E2E: Create PICO → add outcomes → link to recommendation → verify

### Task 2.1.2 — OutcomeService (CRUD + GRADE Assessment)
- Implement `create(picoId, dto)`:
  - Create Outcome with title, outcomeType, ordering
  - **Business rule**: Outcome type is immutable after creation (validated in update)
  - Set default GRADE assessment values (all NOT_SERIOUS/NONE)
  - Order within type group: Dichotomous first, then Continuous, then Narrative
  - Emit `outcome.created` event
- Implement `update(id, dto)`:
  - **Reject** changes to outcomeType (return 422 with message: "Outcome type cannot be changed after creation. Delete and re-create.")
  - Update effect data: effectMeasure, relativeEffect/Lower/Upper, baselineRisk, absoluteEffects, participant counts, numberOfStudies
  - Update GRADE assessment: riskOfBias, inconsistency, indirectness, imprecision, publicationBias, largeEffect, doseResponse, plausibleConfounding
  - Update per-factor footnotes (JSON)
  - Auto-calculate `certaintyOverall` from GRADE factors:
    - Start at HIGH (for RCTs by convention — but this is manual in the data model)
    - Each SERIOUS downgrade = -1 level, VERY_SERIOUS = -2 levels
    - Each upgrade factor PRESENT = +1 level
    - Clamp to HIGH/MODERATE/LOW/VERY_LOW
  - Update plainLanguageSummary, importance (1-9)
  - Handle forest plot image upload (store in S3, save key to forestPlotS3Key)
  - Emit `outcome.updated` event
- Implement `reorder(picoId, orderedIds[])`:
  - Reorder within type groups only (Dichotomous → Continuous → Narrative → CERQual)
  - Update `ordering` values
- Implement `softDelete(id)`:
  - Soft delete outcome
  - Emit `outcome.deleted` event
- Implement continuous outcome calculations:
  - For continuous outcomes, require `continuousUnit`, `continuousScaleLower`, `continuousScaleUpper` for decision aid display
  - Validate scale bounds (lower < upper)
- **Quality gate**: Outcome type immutability enforced; GRADE auto-calculation works
- **Tests**:
  - Unit: Type change rejected; certainty auto-calculation for various factor combinations; reorder within type groups
  - Integration: Forest plot upload saved to S3 correctly
  - E2E: Full outcome lifecycle with GRADE assessment

### Task 2.1.3 — ShadowOutcomeService (Evidence Update Workflow)
- Implement `createShadows(picoId, file)`:
  - Accept updated RevMan .rm5 file
  - **Business rule**: Filename must differ from original import filename
  - Parse new RevMan data (via RevmanImportService)
  - Match new outcomes to existing outcomes by title similarity
  - Create shadow Outcome records: `isShadow = true`, `shadowOfId = originalOutcome.id`
  - Copy new effect data into shadow records
  - Preserve existing GRADE assessment (not imported from RevMan)
  - Return list of shadows with match confidence scores
  - Emit `shadow.created` event
- Implement `acceptShadow(shadowId)`:
  - Copy shadow's effect data into the original outcome
  - Set original outcome's state to UPDATED
  - Delete shadow record
  - Emit `shadow.accepted` event
- Implement `fixMatch(shadowId, newOriginalId)`:
  - Re-assign shadow to a different original outcome
- Implement `excludeShadow(shadowId)`:
  - Delete shadow without applying changes
- **Quality gate**: Shadow workflow creates, matches, and applies updates correctly
- **Tests**:
  - Unit: Filename validation; title matching algorithm; shadow data preservation
  - Integration: Full shadow workflow — create → review → accept → verify original updated
  - Edge cases: No match found; multiple potential matches

### Task 2.1.4 — RevmanImportService (.rm5 XML Parser)
- Implement `parseRevman(file): RevmanData`:
  - Parse RevMan 5 XML (proprietary schema)
  - Extract comparison groups → map to PICO (intervention, comparator)
  - Extract outcome entries → map to Outcome entities
  - Extract study data → map to OutcomeReference links (create References if not existing)
  - Extract effect estimates (OR, RR, MD, SMD) with confidence intervals
  - Extract participant counts and study counts
  - Handle dichotomous absolute effect estimates
  - **NOT extracted** (document clearly in import results):
    - Baseline risk
    - GRADE certainty rating
    - Plain language summary
    - Forest plot images
    - Continuous outcome absolute effects
    - Generic Inverse Variance outcomes (skip with warning)
  - Return structured data for PicoService to create entities
- Implement `importRevman(guidelineId, file)`:
  - Parse file via `parseRevman`
  - Create PICO with outcomes
  - Create or match References by title/DOI
  - Set importSource = REVMAN on PICO
  - Return import summary: created PICOs, outcomes, references, warnings
- **Quality gate**: Correctly parses standard RevMan 5 XML files; skips unsupported data with warnings
- **Tests**:
  - Unit: Parse sample .rm5 file (create test fixtures); verify extracted data structure
  - Edge cases: Missing optional fields; multiple comparisons; empty outcomes
  - Integration: Full import creates expected database records

### Task 2.1.5 — GradeproImportService (JSON-LD Parser)
- Implement `importGradepro(guidelineId, file)`:
  - Parse GRADEpro GDT JSON-LD format
  - Map to PICO + Outcome entities
  - Import everything except plain language summaries
  - **Business rule**: All GRADE judgments must be filled (reject import if any blank judgments)
  - Skip diagnostic accuracy test PICOs (not supported — return warning)
  - Set importSource = GRADEPRO on PICO
  - Return import summary with any warnings
- **Quality gate**: Imports GRADEpro data completely (minus PLS); rejects incomplete judgments
- **Tests**:
  - Unit: Parse sample GRADEpro JSON-LD; verify validation rejects blank judgments
  - Integration: Full import creates correct database records

### Task 2.1.6 — PicoExportService (Multi-format Export)
- Implement `export(picoId, format)`:
  - **Word (DOCX)**: Generate Summary of Findings table in Word format using docx-js
    - Table with columns: Outcome, Study results, Absolute effect (Intervention), Absolute effect (Comparator), Certainty, Plain language
    - GRADE certainty symbols in cells
  - **RevMan .sof**: Export as RevMan Summary of Findings XML
  - **JSON**: Export complete PICO + outcomes as JSON
  - **ZIP** (MAGICapp format): Bundle PICO JSON + linked Reference JSON + attachments
    - Include motherPicoId for provenance tracking
    - Include all outcome data and GRADE assessments
- **Quality gate**: Each export format produces valid, re-importable output
- **Tests**:
  - Unit: Word export generates valid DOCX; JSON export is round-trippable
  - Integration: Export ZIP → import ZIP → verify data integrity

### Task 2.1.7 — PicoCode Management (Terminology Codes)
- Implement `attachCode(picoId, dto)`:
  - Create PicoCode with: codeSystem (SNOMED_CT, ICD10, ATC, RXNORM), code, display, element (POPULATION, INTERVENTION, COMPARATOR, OUTCOME)
  - Validate code system + element combination is reasonable
- Implement `getCodes(picoId)`:
  - Return codes grouped by element
- Implement `removeCode(codeId)`:
  - Delete PicoCode record
- **Quality gate**: Codes attach correctly to the right PICO element
- **Tests**: CRUD cycle for codes; codes visible in PICO queries

### Task 2.1.8 — PracticalIssue Management
- Implement CRUD for PracticalIssue:
  - Create with category (one of 16 PracticalIssueCategory values), title, description (TipTap JSON)
  - Reorder within PICO
  - Update title, description
  - Delete
- **Quality gate**: All 16 categories are valid; ordering maintained
- **Tests**: CRUD cycle; reorder test

### Task 2.1.9 — GradeEvidenceController (REST Endpoints)
- Implement all grade evidence endpoints:
  - `GET /api/v1/guidelines/:id/picos` — list all PICOs
  - `POST /api/v1/guidelines/:id/picos` — create
  - `POST /api/v1/guidelines/:id/picos/import/revman` — import .rm5
  - `POST /api/v1/guidelines/:id/picos/import/gradepro` — import JSON-LD
  - `POST /api/v1/guidelines/:id/picos/import/zip` — import MAGICapp ZIP
  - `GET /api/v1/picos/:id` — get with outcomes
  - `PUT /api/v1/picos/:id` — update P/I/C, narrative
  - `DELETE /api/v1/picos/:id` — soft delete
  - `GET /api/v1/picos/:id/export/:format` — export (word, revman, json, zip)
  - `POST /api/v1/picos/:id/outcomes` — create outcome
  - `PUT /api/v1/outcomes/:id` — update outcome data + GRADE assessment
  - `DELETE /api/v1/outcomes/:id` — soft delete
  - `PUT /api/v1/picos/:id/outcomes/reorder` — batch reorder
  - `POST /api/v1/picos/:id/shadows` — create shadow outcomes
  - `PUT /api/v1/outcomes/:id/accept-shadow` — accept shadow
  - `GET /api/v1/picos/:id/codes` — list codes
  - `POST /api/v1/picos/:id/codes` — attach code
  - `DELETE /api/v1/pico-codes/:id` — remove code
  - `POST /api/v1/picos/:id/practical-issues` — add practical issue
  - `PUT /api/v1/practical-issues/:id` — update
  - `DELETE /api/v1/practical-issues/:id` — remove
- File upload handling for RevMan, GRADEpro, ZIP imports and forest plot images
- Apply `@Roles()`: ADMIN, AUTHOR for mutations; all authenticated for reads
- **Quality gate**: All endpoints work with correct auth and validation
- **Tests**: E2E tests for each endpoint

### Task 2.1.10 — FHIR Projections (Evidence Module)
- `EvidenceFhirProjectionService`:
  - `toEvidence(pico): Evidence` — maps PICO + outcomes to FHIR R5 Evidence
    - `statistic[]` → one per outcome with effect estimates
    - `variableDefinition[]` → references to EvidenceVariable resources for P, I, C, O
    - `certainty[]` → overall and per-factor certainty ratings
  - `toEvidenceVariable(pico, element): EvidenceVariable` — maps P, I, C, or O to separate EvidenceVariable resources
    - `characteristic[]` → coded characteristics from PicoCode records
- `CertaintyFhirProjectionService`:
  - `toCertaintyAssessment(outcome): ArtifactAssessment` — maps GRADE assessment to FHIR ArtifactAssessment (CertaintyOfEvidence profile)
    - `content[].type` = certainty-rating
    - 8 component ratings (5 downgrade + 3 upgrade)
    - Per-factor footnotes
- **Quality gate**: Output validates against FHIR R5 Evidence, EvidenceVariable, ArtifactAssessment
- **Tests**: Unit tests with sample data for each projection

---

## 2.2 Recommendation & EtD Module — Backend (`@app/recommendation-etd` expansion)

### Task 2.2.1 — EtdService (Evidence to Decision Framework)
- Implement `initializeFactors(recommendationId, mode)`:
  - Create EtdFactor records based on EtdMode:
    - `FOUR_FACTOR`: BENEFITS_HARMS, QUALITY_OF_EVIDENCE, PREFERENCES_VALUES, RESOURCES_OTHER
    - `SEVEN_FACTOR`: Above + EQUITY, ACCEPTABILITY, FEASIBILITY
    - `TWELVE_FACTOR`: DESIRABLE_EFFECTS, UNDESIRABLE_EFFECTS, BALANCE, QUALITY_OF_EVIDENCE, PREFERENCES_VALUES, RESOURCES_REQUIRED, CERTAINTY_OF_RESOURCES, COST_EFFECTIVENESS, EQUITY, ACCEPTABILITY, FEASIBILITY (+ overall judgment implied)
  - Set default ordering
  - Initialize empty summaryText, researchEvidence, additionalConsiderations
  - Set all visibility flags to true
- Implement `switchMode(recommendationId, newMode)`:
  - **Business rule**: Switching mode must not lose existing data
  - Add new factors if upgrading (4→7 or 7→12)
  - Retain extra factors if downgrading (12→7 or 7→4) — hide but don't delete
  - Return updated factor list
- Implement `updateFactor(factorId, dto)`:
  - Update summaryText, researchEvidence, additionalConsiderations (all TipTap JSON)
  - Update visibility toggles (summaryPublic, evidencePublic, considerationsPublic)
  - Emit `etd.factor-updated` event
- Implement `updateJudgment(judgmentId, dto)`:
  - Update judgment value (factor-specific dropdown value) and colorCode
  - Emit `etd.judgment-updated` event
- Implement `initializeJudgments(recommendationId)`:
  - Auto-create EtdJudgment records for each factor × each linked intervention
  - Intervention labels sourced from linked PICO interventions + comparators
  - **Business rule**: Judgments persist even if a linked PICO is removed and re-added
- Implement `getJudgmentGrid(recommendationId)`:
  - Return summary grid: factors (rows) × interventions (columns) with judgment values and colors
  - Support intervention re-ordering for ranking discussions
- **Quality gate**: Mode switching preserves data; judgment grid handles multi-intervention correctly
- **Tests**:
  - Unit: Mode initialization creates correct factor set; switching preserves data
  - Integration: PICO link/unlink updates intervention labels; judgments persist across unlink/relink
  - E2E: Full EtD workflow — initialize → populate factors → set judgments → view grid

### Task 2.2.2 — DecisionAidGenerator
- Implement `generate(recommendationId)`:
  - **Prerequisite check**: PICOs must be linked AND have outcomes or practical issues
  - Aggregate data from all linked PICOs:
    - **Layer 1 data**: List of patient-important outcomes + practical issues (titles, categories)
    - **Layer 2 data**: Per outcome — absolute risk with intervention vs. comparator (pictograph data)
      - For dichotomous: baseline risk, absolute effect per 1000
      - For continuous: mean difference with units and scale bounds
      - **Display rule**: Only absolute effects shown (exclude relative effects to prevent framing bias)
    - **Layer 3 data**: Full evidence summary — GRADE assessment, certainty, plain language summary
  - Include practical issues from all 16 categories
  - Support patient-friendly label overrides for outcomes, population, intervention, comparison
  - Return structured JSON for frontend rendering
- **Quality gate**: Decision aid data reflects current PICO state; continuous outcomes require scale data
- **Tests**:
  - Unit: Correct aggregation from multiple PICOs; missing scale data for continuous outcomes returns warning
  - Integration: Update PICO outcome → verify decision aid data refreshes
  - E2E: Create recommendation → link PICOs → verify decision aid endpoint returns correct data

### Task 2.2.3 — EtD/Decision Aid Controller (REST Endpoints)
- Implement remaining recommendation endpoints:
  - `PUT /api/v1/recommendations/:id/picos` — link/unlink PICOs (array of picoIds)
  - `GET /api/v1/recommendations/:id/decision-aid` — get auto-generated decision aid data
  - `GET /api/v1/recommendations/:id/version-diff` — compare with previous published version
  - `GET /api/v1/recommendations/:id/etd` — get EtD factors + judgments
  - `PUT /api/v1/etd-factors/:id` — update factor content
  - `PUT /api/v1/etd-judgments/:id` — update judgment value/color
- **Quality gate**: All endpoints work; PICO linking triggers EtD refresh
- **Tests**: E2E tests for each endpoint

### Task 2.2.4 — EtD FHIR Projection
- `EtdFhirProjectionService`:
  - `toRecommendationJustification(recommendation): ArtifactAssessment` — maps EtD to FHIR ArtifactAssessment (RecommendationJustification profile)
    - `content[].type` = recommendation-justification
    - Each factor as a component with: summary, research evidence, additional considerations
    - Judgment values as coded extensions
    - Visibility flags as extension booleans
- **Quality gate**: Output validates against ArtifactAssessment RecommendationJustification profile
- **Test**: Unit test with 4/7/12 factor variants

---

## 2.3 Frontend — GRADE Evidence Features

### Task 2.3.1 — Evidence Tab Page (`evidence.tsx`)
- Implement evidence/PICO listing page:
  - Table of PICOs: Population, Intervention, Comparator, Outcome count, Status, Actions
  - "Add PICO" button → opens PicoEditor
  - "Import" dropdown: RevMan, GRADEpro, MAGICapp ZIP
  - Click PICO → opens PICO detail view
  - "Export" button per PICO: Word, RevMan, JSON, ZIP
- Implement `usePicos()` TanStack Query hook
- **Quality gate**: PICO list displays correctly; import/export actions trigger correct APIs
- **Test**: Render PICO list; click import → verify dialog opens

### Task 2.3.2 — PICO Editor (`PicoEditor.tsx`)
- Implement PICO editing form:
  - **Population** (P): Text input
  - **Intervention** (I): Text input
  - **Comparator** (C): Text input
  - **Narrative Summary**: TipTap rich text editor
  - **Outcomes panel**: Sortable list of OutcomeRow components (see Task 2.3.3)
  - "Add Outcome" button with type selector dropdown (Dichotomous, Continuous, Narrative, Qualitative CERQual)
  - **PICO Codes tab**: Code autocomplete for SNOMED CT, ICD-10, ATC, RxNorm (per element: P, I, C, O)
  - **Practical Issues tab**: List of PracticalIssue items grouped by 16 categories
  - Section placement selector
  - Recommendation linking selector (multi-select)
- Auto-save on field blur
- **Quality gate**: All PICO fields save correctly; outcome list is interactive
- **Test**: Create PICO → add outcomes → link to recommendation → verify data

### Task 2.3.3 — Outcome Row (`OutcomeRow.tsx`)
- Implement single outcome display in SoF table context:
  - Type indicator icon (dichotomous/continuous/narrative/qualitative)
  - Title (editable inline)
  - State badge (Under development / For review / Updated / Finished)
  - Importance rating (1-9 slider or star rating)
  - Expandable detail panel with data entry fields
  - Drag handle for reordering (within type group only)
- **Quality gate**: Outcome displays correctly; type-specific fields shown
- **Test**: Render each outcome type; verify correct fields displayed

### Task 2.3.4 — Summary of Findings Table (`SofTable.tsx`)
- Implement full GRADE SoF table:
  - Columns: Outcome, № of participants (studies), Relative effect (95% CI), Anticipated absolute effects (With comparator, With intervention, Difference), Certainty, What happens (plain language)
  - One row per outcome
  - Certainty cell: CertaintyBadge (⊕⊕⊕⊕) + footnote indicators
  - Expandable row → shows GRADE assessment panel (Task 2.3.5)
  - Support for all effect measures: RR, OR, HR, MD, SMD, Protective Efficacy
  - Number formatting: effect estimates to 2 decimal places, CIs in parentheses
  - Forest plot thumbnail (if image uploaded)
  - Use TanStack Table for sorting
- **Quality gate**: Table renders correctly for all outcome types and effect measures
- **Tests**:
  - Render with dichotomous outcomes → verify RR/CI formatting
  - Render with continuous outcomes → verify MD/CI formatting
  - Render with narrative outcomes → verify text-only display

### Task 2.3.5 — GRADE Assessment Panel (`GradeAssessment.tsx`)
- Implement 5 downgrade + 3 upgrade factor interface:
  - **Downgrade factors** (each with dropdown):
    - Risk of Bias: Not Serious / Serious / Very Serious
    - Inconsistency: Not Serious / Serious / Very Serious
    - Indirectness: Not Serious / Serious / Very Serious
    - Imprecision: Not Serious / Serious / Very Serious
    - Publication Bias: Not Serious / Serious / Very Serious (+ Undetected / Strongly Suspected)
  - **Upgrade factors** (each with dropdown):
    - Large Effect: None / Present / Large / Very Large
    - Dose Response: None / Present
    - Plausible Confounding: None / Present
  - Per-factor footnote text field
  - Real-time certainty calculation: visual indicator updates as factors change
  - Overall certainty display with auto-calculated level
  - GRADE help tooltips (contextual guidance per factor)
- **Quality gate**: Factor changes immediately update certainty calculation
- **Tests**:
  - Change Risk of Bias to SERIOUS → verify certainty drops one level
  - Set Large Effect to VERY_LARGE → verify certainty increases
  - All-factor combination test

### Task 2.3.6 — Shadow Outcome Panel (`ShadowOutcomePanel.tsx`)
- Implement shadow outcome review interface:
  - Green-highlighted shadow rows alongside original outcomes
  - Side-by-side comparison: old data vs. new data (diff highlighting)
  - Per-shadow actions: "Accept", "Edit Before Accepting", "Fix Match" (re-assign), "Exclude"
  - Progress indicator: X of Y shadows reviewed
- **Quality gate**: Shadow workflow is clear and intuitive; all actions work
- **Test**: Create shadows → accept some → exclude some → verify outcomes updated correctly

### Task 2.3.7 — RevMan Import Wizard (`RevmanImportDialog.tsx`)
- Implement multi-step import dialog:
  - Step 1: File upload (.rm5 file, validate extension)
  - Step 2: Preview parsed data (PICOs, outcomes, references found)
  - Step 3: Review warnings (unsupported data types, missing fields)
  - Step 4: Confirm import
  - Progress indicator during parsing and import
  - Error handling for malformed XML
- **Quality gate**: Import completes with expected data; warnings clearly shown
- **Test**: Upload sample .rm5 → step through wizard → verify imported data

---

## 2.4 Frontend — EtD Framework & Decision Aids

### Task 2.4.1 — EtD Framework Panel (`EtdFramework.tsx`)
- Implement configurable Evidence to Decision display:
  - Mode indicator: 4-factor / 7-factor / 12-factor (from guideline settings)
  - List of factor cards (see Task 2.4.2)
  - Summary of Judgments grid at top (see Task 2.4.3)
  - Mode switch button (admin only) with confirmation dialog
  - Overall recommendation direction/strength summary
- **Quality gate**: All three modes render correctly; mode switching preserves data
- **Test**: Render 4/7/12 factor variants; switch modes → verify no data loss

### Task 2.4.2 — EtD Factor Card (`EtdFactorCard.tsx`)
- Implement individual EtD factor display:
  - Factor title with color-coded judgment badge
  - Collapsible sections:
    - **Summary** (rich text editor, visibility toggle)
    - **Research Evidence** (rich text editor, visibility toggle)
    - **Additional Considerations** (rich text editor, visibility toggle)
  - Judgment dropdown per intervention (factor-specific options)
  - Color picker for judgment badge
- **Quality gate**: Each factor section editable and toggleable independently
- **Test**: Edit summary → verify saves; toggle visibility → verify in published view

### Task 2.4.3 — Judgment Grid (`JudgmentGrid.tsx`)
- Implement multi-intervention comparison grid:
  - Rows: EtD factors
  - Columns: Interventions/comparisons (from linked PICOs)
  - Cells: Judgment value with background color
  - Column reordering (drag-and-drop) for ranking discussions
  - Print-friendly layout
- **Quality gate**: Grid handles multiple interventions; reordering works
- **Test**: Multiple interventions → render grid → reorder columns → verify

### Task 2.4.4 — Decision Aid Preview (`DecisionAidPreview.tsx`)
- Implement auto-generated layered decision aid display:
  - **Layer 1**: Overview cards grid
    - Patient-important outcome cards (title, brief result)
    - Practical issue cards (category icon, title)
  - **Layer 2**: Click outcome card → expand to show:
    - Pictograph display (see Task 2.4.5)
    - Absolute risk with intervention vs. comparator
    - Certainty indicator
  - **Layer 3**: Click "More details" → show:
    - Full evidence summary
    - GRADE assessment
    - Plain language summary
  - Patient-friendly label overrides (editable by author)
  - **Display rule**: No relative effects shown (absolute only)
- Use `usePicos()` and `useDecisionAid()` hooks for data
- **Quality gate**: Three-layer progressive disclosure works; labels are overridable
- **Test**: Render decision aid with sample data → click through layers → verify content

### Task 2.4.5 — Pictograph Display (`PictographDisplay.tsx`)
- Implement absolute risk visualization:
  - For dichotomous outcomes:
    - Grid of 1000 person icons
    - Colored to show baseline risk (comparator) vs. intervention risk
    - Label: "X out of 1000 with comparator" vs. "Y out of 1000 with intervention"
  - For continuous outcomes:
    - Scale visualization with mean difference
    - Units displayed, scale bounds shown
  - Use Recharts for rendering
  - Accessible: screen reader text descriptions
- **Quality gate**: Pictographs render correctly for dichotomous and continuous outcomes
- **Tests**: Snapshot tests for various risk scenarios; accessibility audit

---

## 2.5 Frontend — Track Changes & Presence

### Task 2.5.1 — TipTap Track Changes Extension (`track-changes.ts`)
- Implement ProseMirror track changes:
  - **Mark types**:
    - `insertion`: attrs `{ author, timestamp, accepted }`
    - `deletion`: attrs `{ author, timestamp, accepted }`
  - **When track changes ON** for current user:
    - New text → wrapped in insertion mark (rendered green)
    - Deleted text → wrapped in deletion mark (rendered red strikethrough, not removed)
    - Replaced text → deletion mark on old + insertion mark on new
  - **When track changes OFF**:
    - Direct edits, no marks applied
  - **Accept/Reject operations**:
    - Accept insertion → remove mark, keep text
    - Reject insertion → remove mark AND text
    - Accept deletion → remove mark AND text
    - Reject deletion → remove mark, keep text
  - Accept All / Reject All batch operations
- **Quality gate**: Track changes marks persist in TipTap JSON; accept/reject operations correct
- **Tests**:
  - Unit: Insert text with tracking → verify insertion mark in JSON
  - Unit: Delete text with tracking → verify deletion mark, text preserved
  - Unit: Accept insertion → verify text kept, mark removed
  - Unit: Accept deletion → verify text removed

### Task 2.5.2 — Track Changes Toggle (`TrackChangesToggle.tsx`)
- Implement three-level toggle:
  - Per text box: Toggle within each TipTap editor instance
  - Per user per guideline: User preference stored in Zustand
  - Per guideline (admin): Overrides all users (from guideline settings `trackChangesDefault`)
- Visual indicators:
  - Green pen+lines icon on items with unresolved track changes
  - Track changes toolbar in TipTap editor: Accept, Reject, Accept All, Reject All, Next Change, Previous Change
- **Quality gate**: Toggle levels cascade correctly (admin override > user pref > per-box)
- **Test**: Toggle at each level → verify TipTap behavior changes; visual indicators appear when changes exist

### Task 2.5.3 — TipTap Comments Extension (`comments.ts`)
- Implement inline comment marks:
  - `comment` mark: attrs `{ author, timestamp, threadId }`
  - Highlighted text with yellow background
  - Click to open comment thread popover
  - Comment thread: reply chain with resolve/reject
  - Integration with FeedbackComment model (store in DB, not just in TipTap JSON)
- **Quality gate**: Comments persist across page reloads; threads work
- **Test**: Add comment → reply → resolve → verify state persisted

### Task 2.5.4 — TipTap Citation Link Extension (`citation-link.ts`)
- Implement inline reference citations:
  - `citation` mark: attrs `{ referenceId }`
  - Rendered as `[N]` where N is the auto-numbered reference number
  - Click → popover with reference details (title, authors, year)
  - Autocomplete when typing `[` → shows reference search
  - Numbers update when references are reordered (computed from reference auto-numbering service)
- **Quality gate**: Citation numbers reflect current reference ordering; popover shows correct data
- **Test**: Insert citation → verify number matches reference order; reorder sections → verify numbers update

### Task 2.5.5 — Presence Indicators (`usePresence.ts`)
- Implement editing presence tracking:
  - `POST /api/v1/guidelines/:id/presence` — report current editing state (entity type + ID)
  - `GET /api/v1/guidelines/:id/presence` — who is editing what
  - Poll every 30 seconds
  - Backend: store in Redis with 60s TTL (auto-expire stale presence)
  - Frontend:
    - Show green pen icon (someone else editing this item) → red pen with hover tooltip showing who
    - Activity log badge with count of new edits
    - User avatars on items being edited by others
- **Quality gate**: Presence updates within 30 seconds; stale indicators expire
- **Tests**:
  - Unit: Presence hook polls at correct interval; processes response correctly
  - Integration: Two users editing → verify presence indicators appear for each other

---

## Phase 2 Summary

| Category | Count |
|----------|-------|
| Backend tasks | 14 |
| Frontend tasks | 15 |
| Total tasks | 29 |
| API endpoints implemented | ~25 |
| FHIR projections | 4 (Evidence, EvidenceVariable, ArtifactAssessment x2) |
| Import parsers | 2 (RevMan, GRADEpro) |
| Export formats | 4 (Word, RevMan .sof, JSON, ZIP) |
| TipTap extensions | 4 (track changes, comments, citation links, GRADE tooltips) |
