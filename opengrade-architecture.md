# OpenGRADE: Architecture Specification
## Open-Source Living Guideline Platform — FHIR-Native, Node/React Stack

**Version**: 0.1.0-DRAFT
**Date**: 2026-02-10
**Status**: Architecture Definition — Implementation in progress (see §11 for current status)
**Derived From**: MAGICapp Technical Extraction (v12.2, February 2026)

---

## 1. Architectural Principles

### 1.1 Core Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | React 19 + Vite + TailwindCSS + shadcn/ui | Desktop-first authoring; complex document editing; largest ecosystem for rich text components |
| Mobile Strategy | Capacitor (Phase 2) | PWA service worker + Capacitor native shell; avoids Ionic component lock-in |
| Backend | NestJS 11 (TypeScript) | Module system maps 1:1 to domain modules; DI for testability; guards/interceptors for cross-cutting concerns |
| Database | PostgreSQL 16 + Prisma ORM | JSONB for semi-structured FHIR extensions; full-text search; row-level security; Prisma for type-safe schema evolution |
| Data Model | FHIR-native (R5) | Internal entities mirror FHIR resource structures; export is projection, not transformation |
| Identity | Keycloak 24 | OIDC/SAML federation; matches MAGICapp's auth stack; supports institutional SSO |
| Rich Text | TipTap 3 (ProseMirror) | Track changes plugin; collaborative cursors; structured JSON document model; extensible schema |
| File Storage | S3-compatible (MinIO self-hosted / AWS S3) | PDF snapshots, RevMan files, COI documents, forest plot images |
| Search | PostgreSQL full-text + pg_trgm | Avoids Elasticsearch complexity for MVP; trigram index for fuzzy reference matching |
| API Style | REST (OpenAPI 3.1) + FHIR facade | Internal API is REST; FHIR endpoints are a read-only projection layer initially |
| Deployment | Docker Compose → Kubernetes | Single-node Docker Compose for dev/small orgs; K8s Helm chart for production scale |

### 1.2 FHIR-Native Schema Philosophy

Rather than building an internal schema and bolting on FHIR translation, the database schema mirrors FHIR R5 resource structures from day one. Each core entity table stores:

- A `fhir_resource_type` discriminator column
- A `fhir_id` (UUID, serves as `Resource.id`)
- A `fhir_meta` JSONB column (versionId, lastUpdated, profile URLs, tags, security labels)
- Domain-specific columns for queryable/indexable fields
- A `fhir_extensions` JSONB column for non-standard data that doesn't warrant a dedicated column

This means FHIR serialization is a **projection** (SELECT + JSON assembly) rather than a **transformation** (query + map + restructure). The internal REST API can still use flattened DTOs for developer ergonomics while the `/fhir/*` endpoints serve canonical FHIR bundles.

### 1.3 Module Boundary Rules

Each NestJS module owns:
- Its database entities (Prisma models)
- Its REST controllers and DTOs
- Its service layer (business logic)
- Its event emitters (for cross-module communication)
- Its FHIR projection service (resource serialization)

Cross-module communication uses **NestJS EventEmitter2** (async events) rather than direct service injection, enabling future extraction to microservices. The only shared dependency is the `@core` module (auth, audit, RBAC, config).

---

## 2. FHIR Resource Mapping

### 2.1 Entity-to-FHIR Resource Map

| Domain Entity | FHIR R5 Resource | CPG/EBM Profile | Notes |
|--------------|------------------|-----------------|-------|
| **Organization** | `Organization` | — | Publisher identity |
| **Guideline** | `Composition` | CPGComputableGuideline | Top-level container; sections map to `Composition.section` |
| **Section** | `Composition.section` | — | Recursive via `section.section`; `section.text` for narrative |
| **Recommendation** | `PlanDefinition` | CPGRecommendationDefinition | `action[]` for interventions; `type` = eca-rule |
| **PICO Question** | `EvidenceVariable` (x4) | — | One EvidenceVariable per P, I, C, O; grouped by `relatedArtifact` |
| **Evidence Profile** | `Evidence` | — | Links EvidenceVariables; carries statistics |
| **Outcome** | `Evidence.statistic` | — | Nested within Evidence; effect estimates, sample sizes |
| **GRADE Assessment** | `ArtifactAssessment` | CertaintyOfEvidence | `content[].type` = certainty-rating; 8 GRADE factors as components |
| **EtD Framework** | `ArtifactAssessment` | RecommendationJustification | `content[].type` = recommendation-justification; 4/7/12 factors |
| **Reference** | `Citation` | — | Full bibliographic data; `citedArtifact` for metadata |
| **Decision Aid** | `PlanDefinition` | — | `type` = clinical-protocol; generated from linked Evidence |
| **Version/Snapshot** | `Bundle` | — | `type` = document; immutable published snapshot |
| **COI Record** | `Provenance` | — | `agent` = panel member; `entity` = intervention; custom extensions |
| **Activity Log** | `AuditEvent` | — | FHIR AuditEvent for standards-compliant audit trail |
| **Code Attachment** | `CodeableConcept` | — | SNOMED CT, ICD-10, ATC, RxNorm embedded in parent resources |
| **User/Member** | `Practitioner` | — | Panel members, authors, reviewers |

### 2.2 FHIR-Native Column Strategy

For the `Recommendation` entity (maps to `PlanDefinition`), the table design looks like:

```
recommendation
├── id                    UUID (PK, = FHIR Resource.id)
├── guideline_id          UUID (FK → guideline)
├── section_id            UUID (FK → section, nullable)
├── fhir_meta             JSONB { versionId, lastUpdated, profile[], tag[], security[] }
├── status                ENUM (draft, active, retired, unknown) — mirrors PlanDefinition.status
├── title                 TEXT — PlanDefinition.title
├── description           TEXT — PlanDefinition.description (recommendation text)
├── strength              ENUM (strong-for, conditional-for, conditional-against, strong-against, not-set)
├── strength_label        TEXT — custom org label (nullable, overrides enum display)
├── direction             ENUM (for, against)
├── recommendation_type   ENUM (grade, practice-statement, statutory, info-box, consensus, no-label)
├── header                TEXT — short navigation text
├── remark                TEXT — critical info shown at top level
├── rationale             JSONB — TipTap document JSON (rich text)
├── practical_info        JSONB — TipTap document JSON (rich text)
├── certainty_of_evidence ENUM (high, moderate, low, very-low)
├── rec_status            ENUM (new, updated, in-review, possibly-outdated, updated-evidence, reviewed, no-label)
├── rec_status_date       TIMESTAMPTZ
├── rec_status_comment    TEXT
├── ordering              INTEGER — position within section
├── is_hidden             BOOLEAN DEFAULT false
├── is_deleted            BOOLEAN DEFAULT false — soft delete
├── etd_mode              ENUM (4-factor, 7-factor, 12-factor) — inherited from guideline, overridable
├── fhir_extensions       JSONB — overflow for non-standard FHIR extensions
├── created_at            TIMESTAMPTZ
├── updated_at            TIMESTAMPTZ
├── created_by            UUID (FK → user)
├── updated_by            UUID (FK → user)
```

The FHIR projection service assembles this into a `PlanDefinition` JSON resource by:
1. Mapping status/title/description directly
2. Building `useContext` from linked PICO codes
3. Building `relatedArtifact` from linked Evidence and Citation resources
4. Building `action[]` from the recommendation strength/direction
5. Including `extension[]` for GRADE-specific metadata (strength, certainty)
6. Wrapping rationale/practical_info as `Narrative` type within extensions

---

## 3. Database Schema (PostgreSQL + Prisma)

### 3.1 Core Tables

```prisma
// ============================================================
// CORE MODULE — Shared infrastructure
// ============================================================

model Organization {
  id              String      @id @default(uuid()) @db.Uuid
  name            String
  description     String?
  logoUrl         String?
  customColors    Json?       // { primary, secondary, accent }
  strengthLabels  Json?       // { "conditional": "Weak", ... } custom GRADE labels
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  guidelines      Guideline[]
  members         OrganizationMember[]
}

model User {
  id              String      @id @default(uuid()) @db.Uuid
  keycloakId      String      @unique // external identity
  email           String      @unique
  displayName     String
  locale          String      @default("en")
  createdAt       DateTime    @default(now())
  
  orgMemberships  OrganizationMember[]
  permissions     GuidelinePermission[]
  activities      ActivityLogEntry[]
  coiRecords      CoiRecord[]
  tasks           Task[]
}

model OrganizationMember {
  id              String      @id @default(uuid()) @db.Uuid
  organizationId  String      @db.Uuid
  userId          String      @db.Uuid
  role            OrgRole     @default(MEMBER) // ADMIN, MEMBER
  
  organization    Organization @relation(fields: [organizationId], references: [id])
  user            User         @relation(fields: [userId], references: [id])
  
  @@unique([organizationId, userId])
}

// ============================================================
// GUIDELINE AUTHORING MODULE
// ============================================================

model Guideline {
  id              String      @id @default(uuid()) @db.Uuid
  fhirMeta        Json        @default("{}") // FHIR Composition.meta
  organizationId  String?     @db.Uuid       // null = personal guideline
  title           String
  shortName       String?     @unique        // URL-friendly slug for permalinks
  description     String?     @db.Text
  disclaimer      String?     @db.Text
  funding         String?     @db.Text
  contactName     String?
  contactEmail    String?
  language        String      @default("en") // ISO 639-1
  startDate       DateTime?
  guidelineType   GuidelineType @default(ORGANIZATIONAL)
  status          GuidelineStatus @default(DRAFT)
  
  // Configurable settings
  etdMode         EtdMode     @default(SEVEN_FACTOR)
  showSectionNumbers    Boolean @default(true)
  showCertaintyInLabel  Boolean @default(false)
  showGradeDescription  Boolean @default(true)
  trackChangesDefault   Boolean @default(false)
  enableSubscriptions   Boolean @default(false)
  enablePublicComments  Boolean @default(false)
  showSectionTextPreview Boolean @default(true)
  
  // PDF/Export settings
  pdfColumnLayout Int         @default(1) // 1 or 2
  picoDisplayMode PicoDisplay @default(INLINE) // INLINE, ANNEX
  coverPageUrl    String?
  
  isPublic        Boolean     @default(false)
  isDeleted       Boolean     @default(false)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  createdBy       String      @db.Uuid
  
  organization    Organization? @relation(fields: [organizationId], references: [id])
  sections        Section[]
  references      Reference[]
  picos           Pico[]
  recommendations Recommendation[]
  versions        GuidelineVersion[]
  permissions     GuidelinePermission[]
  milestones      Milestone[]
  checklists      ChecklistItem[]
  polls           Poll[]
  tags            Tag[]
  coiRecords      CoiRecord[]
  tasks           Task[]
  subscribers     Subscriber[]
  internalDocs    InternalDocument[]
}

model Section {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  parentId        String?     @db.Uuid       // recursive nesting
  title           String
  text            Json?       // TipTap document JSON (rich text with track changes)
  ordering        Int         @default(0)
  nestingLevel    Int         @default(0)
  excludeFromNumbering Boolean @default(false)
  isDeleted       Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
  parent          Section?    @relation("SectionTree", fields: [parentId], references: [id])
  children        Section[]   @relation("SectionTree")
  
  // Content within this section (ordered by type then ordering)
  sectionReferences     SectionReference[]
  sectionPicos          SectionPico[]
  sectionRecommendations SectionRecommendation[]
}

// ============================================================
// REFERENCE MANAGEMENT MODULE
// ============================================================

model Reference {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  fhirMeta        Json        @default("{}") // FHIR Citation.meta
  title           String
  authors         String?     @db.Text
  year            Int?
  abstract        String?     @db.Text
  pubmedId        String?     // 8-digit PubMed ID
  doi             String?
  url             String?
  studyType       StudyType   @default(OTHER) // PRIMARY_STUDY, SYSTEMATIC_REVIEW, OTHER
  isDeleted       Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
  sectionPlacements SectionReference[]
  outcomeLinks    OutcomeReference[]
  attachments     ReferenceAttachment[]
  
  @@index([guidelineId, pubmedId])
  @@index([guidelineId, doi])
}

model ReferenceAttachment {
  id              String      @id @default(uuid()) @db.Uuid
  referenceId     String      @db.Uuid
  fileName        String
  mimeType        String
  s3Key           String      // S3 object key
  uploadedBy      String      @db.Uuid
  uploadedAt      DateTime    @default(now())
  
  reference       Reference   @relation(fields: [referenceId], references: [id])
}

// ============================================================
// GRADE EVIDENCE MODULE
// ============================================================

model Pico {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  fhirMeta        Json        @default("{}") // FHIR Evidence.meta
  population      String      @db.Text       // P
  intervention    String      @db.Text       // I
  comparator      String      @db.Text       // C
  narrativeSummary Json?      // TipTap document JSON
  motherPicoId    String?     @db.Uuid       // provenance tracking for imported PICOs
  importSource    ImportSource? // REVMAN, GRADEPRO, MAGICAPP_ZIP, MANUAL
  isDeleted       Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
  outcomes        Outcome[]
  codes           PicoCode[]
  practicalIssues PracticalIssue[]
  sectionPlacements SectionPico[]
  recommendationLinks PicoRecommendation[]
}

model Outcome {
  id              String      @id @default(uuid()) @db.Uuid
  picoId          String      @db.Uuid
  title           String
  outcomeType     OutcomeType // DICHOTOMOUS, CONTINUOUS, NARRATIVE, QUALITATIVE_CERQUAL
  state           OutcomeState @default(UNDER_DEVELOPMENT)
  ordering        Int         @default(0)
  importance      Int?        // 1-9 panel importance rating
  
  // Effect data (FHIR Evidence.statistic)
  effectMeasure   EffectMeasure? // RR, OR, HR, MD, SMD, PROTECTIVE_EFFICACY
  relativeEffect  Float?
  relativeEffectLower Float?
  relativeEffectUpper Float?
  baselineRisk    Float?
  absoluteEffectIntervention Float?
  absoluteEffectComparison   Float?
  interventionParticipants   Int?
  comparisonParticipants     Int?
  numberOfStudies Int?
  
  // Continuous outcome specifics
  continuousUnit  String?     // unit of measurement
  continuousScaleLower Float? // lower bound of scale
  continuousScaleUpper Float? // upper bound of scale
  
  // GRADE quality assessment (FHIR ArtifactAssessment)
  certaintyOverall CertaintyLevel? // HIGH, MODERATE, LOW, VERY_LOW
  riskOfBias      GradeRating     @default(NOT_SERIOUS) // NOT_SERIOUS, SERIOUS, VERY_SERIOUS
  inconsistency   GradeRating     @default(NOT_SERIOUS)
  indirectness    GradeRating     @default(NOT_SERIOUS)
  imprecision     GradeRating     @default(NOT_SERIOUS)
  publicationBias GradeRating     @default(NOT_SERIOUS) // adds UNDETECTED, STRONGLY_SUSPECTED
  largeEffect     UpgradeRating   @default(NONE)        // NONE, LARGE, VERY_LARGE
  doseResponse    UpgradeRating   @default(NONE)
  plausibleConfounding UpgradeRating @default(NONE)
  
  // Per-factor footnotes
  gradeFootnotes  Json?       // { "riskOfBias": "...", "inconsistency": "...", ... }
  
  // Plain language summary
  plainLanguageSummary String? @db.Text
  
  // Forest plot image
  forestPlotS3Key String?
  
  // Shadow outcome (for evidence updates)
  isShadow        Boolean     @default(false)
  shadowOfId      String?     @db.Uuid // FK to the original outcome being updated
  
  isDeleted       Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  pico            Pico        @relation(fields: [picoId], references: [id])
  shadowOf        Outcome?    @relation("ShadowOutcome", fields: [shadowOfId], references: [id])
  shadows         Outcome[]   @relation("ShadowOutcome")
  referenceLinks  OutcomeReference[]
}

model PicoCode {
  id              String      @id @default(uuid()) @db.Uuid
  picoId          String      @db.Uuid
  codeSystem      CodeSystem  // SNOMED_CT, ICD10, ATC, RXNORM
  code            String      // the actual code value
  display         String      // human-readable display text
  element         PicoElement // POPULATION, INTERVENTION, COMPARATOR, OUTCOME
  
  pico            Pico        @relation(fields: [picoId], references: [id])
  
  @@index([picoId, codeSystem])
}

model PracticalIssue {
  id              String      @id @default(uuid()) @db.Uuid
  picoId          String      @db.Uuid
  category        PracticalIssueCategory // 16 categories from Heen et al.
  title           String
  description     Json?       // TipTap document JSON
  ordering        Int         @default(0)
  
  pico            Pico        @relation(fields: [picoId], references: [id])
}

// ============================================================
// RECOMMENDATION & EtD MODULE
// ============================================================

model Recommendation {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  fhirMeta        Json        @default("{}") // FHIR PlanDefinition.meta
  
  // Core recommendation data
  title           String?     // optional header for navigation
  description     Json        // TipTap document JSON — the recommendation text
  strength        RecommendationStrength @default(NOT_SET)
  recommendationType RecommendationType @default(GRADE)
  header          String?     // short navigation text
  remark          Json?       // TipTap document JSON — critical info shown at top
  rationale       Json?       // TipTap document JSON
  practicalInfo   Json?       // TipTap document JSON
  
  // Status tracking (living guideline metadata)
  recStatus       RecStatus   @default(NEW)
  recStatusDate   DateTime?
  recStatusComment String?
  
  // Display
  certaintyOfEvidence CertaintyLevel?
  ordering        Int         @default(0)
  isHidden        Boolean     @default(false)
  isDeleted       Boolean     @default(false)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  createdBy       String      @db.Uuid
  updatedBy       String      @db.Uuid
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
  sectionPlacements SectionRecommendation[]
  picoLinks       PicoRecommendation[]
  etdFactors      EtdFactor[]
  emrElements     EmrElement[]
  tags            RecommendationTag[]
  comments        FeedbackComment[]
}

model EtdFactor {
  id              String      @id @default(uuid()) @db.Uuid
  recommendationId String     @db.Uuid
  factorType      EtdFactorType // see enum — 4, 7, or 12 factor variants
  ordering        Int         @default(0)
  
  // Content fields
  summaryText     Json?       // TipTap document JSON
  researchEvidence Json?      // TipTap document JSON
  additionalConsiderations Json? // TipTap document JSON
  
  // Visibility controls
  summaryPublic   Boolean     @default(true)
  evidencePublic  Boolean     @default(true)
  considerationsPublic Boolean @default(true)
  
  recommendation  Recommendation @relation(fields: [recommendationId], references: [id])
  judgments       EtdJudgment[]
}

model EtdJudgment {
  id              String      @id @default(uuid()) @db.Uuid
  etdFactorId     String      @db.Uuid
  interventionLabel String    // which intervention this judgment is for
  judgment        String?     // the judgment value (factor-specific options)
  colorCode       String?     // hex color for visual display
  
  etdFactor       EtdFactor   @relation(fields: [etdFactorId], references: [id])
}

// ============================================================
// CLINICAL INTEGRATION MODULE
// ============================================================

model EmrElement {
  id              String      @id @default(uuid()) @db.Uuid
  recommendationId String     @db.Uuid
  elementType     EmrElementType // TARGET_POPULATION, INTERVENTION
  codeSystem      CodeSystem
  code            String
  display         String
  implementationDescription String? @db.Text
  
  recommendation  Recommendation @relation(fields: [recommendationId], references: [id])
}

// ============================================================
// PUBLISHING & VERSION CONTROL MODULE
// ============================================================

model GuidelineVersion {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  versionNumber   String      // "1.0", "1.1", "2.0" etc.
  versionType     VersionType // MAJOR, MINOR
  comment         String?     @db.Text
  isPublic        Boolean     @default(false)
  publishedAt     DateTime    @default(now())
  publishedBy     String      @db.Uuid
  
  // Immutable snapshot
  snapshotBundle  Json        // Complete FHIR Bundle (type=document) of all resources at publish time
  pdfS3Key        String?     // generated PDF stored in S3
  jsonS3Key       String?     // generated JSON export stored in S3
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
  permissions     VersionPermission[]
  
  @@unique([guidelineId, versionNumber])
}

// ============================================================
// COLLABORATION & GOVERNANCE MODULE
// ============================================================

model GuidelinePermission {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  userId          String      @db.Uuid
  role            GuidelineRole // ADMIN, AUTHOR, REVIEWER, VIEWER
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
  user            User        @relation(fields: [userId], references: [id])
  
  @@unique([guidelineId, userId])
}

model ActivityLogEntry {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  userId          String      @db.Uuid
  timestamp       DateTime    @default(now())
  actionType      String      // CREATE, UPDATE, DELETE, PUBLISH, PERMISSION_CHANGE, etc.
  entityType      String      // RECOMMENDATION, PICO, OUTCOME, SECTION, REFERENCE, etc.
  entityId        String      @db.Uuid
  entityTitle     String?     // snapshot of entity title at time of action
  changeDetails   Json?       // { field: "strength", old: "conditional-for", new: "strong-for" }
  comment         String?
  isFlagged       Boolean     @default(false)
  
  user            User        @relation(fields: [userId], references: [id])
  
  @@index([guidelineId, timestamp(sort: Desc)])
  @@index([guidelineId, entityType, entityId])
  @@index([guidelineId, userId])
}

model CoiRecord {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  userId          String      @db.Uuid
  publicSummary   String?     @db.Text
  internalSummary String?     @db.Text
  updatedAt       DateTime    @updatedAt
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
  user            User        @relation(fields: [userId], references: [id])
  interventionConflicts CoiInterventionConflict[]
  documents       CoiDocument[]
  
  @@unique([guidelineId, userId])
}

model CoiInterventionConflict {
  id              String      @id @default(uuid()) @db.Uuid
  coiRecordId     String      @db.Uuid
  interventionLabel String    // auto-populated from PICO interventions/comparators
  conflictLevel   ConflictLevel @default(NONE) // NONE, LOW, MODERATE, HIGH
  internalComment String?
  excludeFromVoting Boolean   @default(false)
  isPublic        Boolean     @default(true)
  
  coiRecord       CoiRecord   @relation(fields: [coiRecordId], references: [id])
}

model Milestone {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  title           String
  targetDate      DateTime?
  responsiblePerson String?
  isCompleted     Boolean     @default(false)
  ordering        Int         @default(0)
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
}

model ChecklistItem {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  category        String      // AGREE_II, SNAP_IT, CUSTOM
  label           String
  isChecked       Boolean     @default(false)
  checkedBy       String?     @db.Uuid
  checkedAt       DateTime?
  ordering        Int         @default(0)
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
}

model Poll {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  recommendationId String?    @db.Uuid // null = guideline-level poll
  title           String
  pollType        PollType    // OPEN_TEXT, MULTIPLE_CHOICE, STRENGTH_VOTE, ETD_JUDGMENT
  options         Json?       // for multiple choice: ["Option A", "Option B", ...]
  isActive        Boolean     @default(true)
  createdAt       DateTime    @default(now())
  createdBy       String      @db.Uuid
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
  votes           PollVote[]
}

model PollVote {
  id              String      @id @default(uuid()) @db.Uuid
  pollId          String      @db.Uuid
  userId          String      @db.Uuid
  value           Json        // flexible: { "choice": "Option A" } or { "strength": "strong-for" }
  comment         String?
  votedAt         DateTime    @default(now())
  
  poll            Poll        @relation(fields: [pollId], references: [id])
  
  @@unique([pollId, userId])
}

model FeedbackComment {
  id              String      @id @default(uuid()) @db.Uuid
  recommendationId String     @db.Uuid
  parentId        String?     @db.Uuid // threaded replies
  userId          String      @db.Uuid
  content         String      @db.Text
  status          CommentStatus @default(OPEN) // OPEN, RESOLVED, REJECTED
  createdAt       DateTime    @default(now())
  
  recommendation  Recommendation @relation(fields: [recommendationId], references: [id])
  parent          FeedbackComment? @relation("CommentThread", fields: [parentId], references: [id])
  replies         FeedbackComment[] @relation("CommentThread")
}

model Task {
  id              String      @id @default(uuid()) @db.Uuid
  guidelineId     String      @db.Uuid
  assigneeId      String?     @db.Uuid
  title           String
  description     String?     @db.Text
  dueDate         DateTime?
  status          TaskStatus  @default(TODO) // TODO, IN_PROGRESS, DONE
  entityType      String?     // optional link to PICO, RECOMMENDATION, etc.
  entityId        String?     @db.Uuid
  createdAt       DateTime    @default(now())
  createdBy       String      @db.Uuid
  
  guideline       Guideline   @relation(fields: [guidelineId], references: [id])
  assignee        User?       @relation(fields: [assigneeId], references: [id])
}

// ============================================================
// JOIN TABLES (many-to-many)
// ============================================================

model SectionReference {
  sectionId       String      @db.Uuid
  referenceId     String      @db.Uuid
  ordering        Int         @default(0)
  
  section         Section     @relation(fields: [sectionId], references: [id])
  reference       Reference   @relation(fields: [referenceId], references: [id])
  
  @@id([sectionId, referenceId])
}

model SectionPico {
  sectionId       String      @db.Uuid
  picoId          String      @db.Uuid
  ordering        Int         @default(0)
  
  section         Section     @relation(fields: [sectionId], references: [id])
  pico            Pico        @relation(fields: [picoId], references: [id])
  
  @@id([sectionId, picoId])
}

model SectionRecommendation {
  sectionId       String      @db.Uuid
  recommendationId String     @db.Uuid
  ordering        Int         @default(0)
  
  section         Section     @relation(fields: [sectionId], references: [id])
  recommendation  Recommendation @relation(fields: [recommendationId], references: [id])
  
  @@id([sectionId, recommendationId])
}

model PicoRecommendation {
  picoId          String      @db.Uuid
  recommendationId String     @db.Uuid
  
  pico            Pico        @relation(fields: [picoId], references: [id])
  recommendation  Recommendation @relation(fields: [recommendationId], references: [id])
  
  @@id([picoId, recommendationId])
}

model OutcomeReference {
  outcomeId       String      @db.Uuid
  referenceId     String      @db.Uuid
  
  outcome         Outcome     @relation(fields: [outcomeId], references: [id])
  reference       Reference   @relation(fields: [referenceId], references: [id])
  
  @@id([outcomeId, referenceId])
}

model RecommendationTag {
  recommendationId String     @db.Uuid
  tagId           String      @db.Uuid
  
  recommendation  Recommendation @relation(fields: [recommendationId], references: [id])
  tag             Tag         @relation(fields: [tagId], references: [id])
  
  @@id([recommendationId, tagId])
}

// ============================================================
// ENUMS
// ============================================================

enum OrgRole { ADMIN MEMBER }
enum GuidelineType { PERSONAL ORGANIZATIONAL EVIDENCE_SUMMARY }
enum GuidelineStatus { DRAFT DRAFT_INTERNAL PUBLISHED_INTERNAL PUBLIC_CONSULTATION PUBLISHED }
enum GuidelineRole { ADMIN AUTHOR REVIEWER VIEWER }
enum StudyType { PRIMARY_STUDY SYSTEMATIC_REVIEW OTHER }
enum OutcomeType { DICHOTOMOUS CONTINUOUS NARRATIVE QUALITATIVE_CERQUAL }
enum OutcomeState { UNDER_DEVELOPMENT FOR_REVIEW UPDATED FINISHED }
enum EffectMeasure { RR OR HR MD SMD PROTECTIVE_EFFICACY }
enum CertaintyLevel { HIGH MODERATE LOW VERY_LOW }
enum GradeRating { NOT_SERIOUS SERIOUS VERY_SERIOUS }
enum UpgradeRating { NONE PRESENT LARGE VERY_LARGE }
enum CodeSystem { SNOMED_CT ICD10 ATC RXNORM }
enum PicoElement { POPULATION INTERVENTION COMPARATOR OUTCOME }
enum ImportSource { REVMAN GRADEPRO MAGICAPP_ZIP MANUAL }
enum RecommendationStrength { STRONG_FOR CONDITIONAL_FOR CONDITIONAL_AGAINST STRONG_AGAINST NOT_SET }
enum RecommendationType { GRADE PRACTICE_STATEMENT STATUTORY INFO_BOX CONSENSUS NO_LABEL }
enum RecStatus { NEW UPDATED IN_REVIEW POSSIBLY_OUTDATED UPDATED_EVIDENCE REVIEWED NO_LABEL }
enum EtdMode { FOUR_FACTOR SEVEN_FACTOR TWELVE_FACTOR }
enum VersionType { MAJOR MINOR }
enum ConflictLevel { NONE LOW MODERATE HIGH }
enum PollType { OPEN_TEXT MULTIPLE_CHOICE STRENGTH_VOTE ETD_JUDGMENT }
enum CommentStatus { OPEN RESOLVED REJECTED }
enum TaskStatus { TODO IN_PROGRESS DONE }
enum EmrElementType { TARGET_POPULATION INTERVENTION }
enum PicoDisplay { INLINE ANNEX }

enum EtdFactorType {
  // 4-factor (original GRADE)
  BENEFITS_HARMS
  QUALITY_OF_EVIDENCE
  PREFERENCES_VALUES
  RESOURCES_OTHER
  // 7-factor additions
  EQUITY
  ACCEPTABILITY
  FEASIBILITY
  // 12-factor (DECIDE/Epistemonikos) expansions
  DESIRABLE_EFFECTS
  UNDESIRABLE_EFFECTS
  BALANCE
  RESOURCES_REQUIRED
  CERTAINTY_OF_RESOURCES
  COST_EFFECTIVENESS
}

enum PracticalIssueCategory {
  MEDICATION_ROUTINE
  TESTS_AND_VISITS
  PROCEDURE_AND_DEVICE
  RECOVERY_AND_ADAPTATION
  COORDINATION_OF_CARE
  ADVERSE_EFFECTS
  INTERACTIONS_AND_ANTIDOTE
  PHYSICAL_WELLBEING
  EMOTIONAL_WELLBEING
  PREGNANCY_AND_NURSING
  COSTS_AND_ACCESS
  FOOD_AND_DRINKS
  EXERCISE_AND_ACTIVITIES
  SOCIAL_LIFE_AND_RELATIONSHIPS
  WORK_AND_EDUCATION
  TRAVEL_AND_DRIVING
}
```

### 3.2 Key Indexes Beyond Prisma Defaults

```sql
-- Full-text search on references (title + authors + abstract)
CREATE INDEX idx_reference_fts ON "Reference" 
  USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(authors,'') || ' ' || coalesce(abstract,'')));

-- Trigram index for fuzzy reference deduplication
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_reference_title_trgm ON "Reference" USING gin(title gin_trgm_ops);

-- Activity log composite for dashboard queries
CREATE INDEX idx_activity_guideline_recent ON "ActivityLogEntry" (guideline_id, timestamp DESC) 
  INCLUDE (action_type, entity_type, user_id);

-- PICO code lookups for clinical integration
CREATE INDEX idx_pico_code_system ON "PicoCode" (code_system, code);

-- Guideline version lookups
CREATE INDEX idx_version_guideline_published ON "GuidelineVersion" (guideline_id, published_at DESC);
```

---

## 4. NestJS Module Architecture

### 4.1 Module Dependency Graph

```
@app/core ─────────────────────────────────────────────────────────
  │  AuthModule (Keycloak OIDC guard)
  │  RbacModule (permission checks, @Roles decorator)
  │  AuditModule (activity log interceptor — auto-captures all mutations)
  │  ConfigModule (environment, feature flags)
  │  StorageModule (S3 abstraction)
  │  FhirCoreModule (base serialization utilities, FHIR types)
  │
  ├── @app/guideline-authoring ────────────────────────────────────
  │     GuidelineService, SectionService
  │     GuidelineController (/api/guidelines, /api/sections)
  │     GuidelineFhirProjection → Composition resource
  │     Events: guideline.created, guideline.updated, section.reordered
  │
  ├── @app/reference-management ───────────────────────────────────
  │     ReferenceService, PubmedImportService, RisImportService
  │     DeduplicationService (pg_trgm similarity + DOI/PMID exact match)
  │     ReferenceController (/api/references)
  │     ReferenceFhirProjection → Citation resource
  │     Events: reference.created, reference.deleted, reference.bulk-edit-lock
  │
  ├── @app/grade-evidence ─────────────────────────────────────────
  │     PicoService, OutcomeService, ShadowOutcomeService
  │     RevmanImportService (.rm5 XML parser)
  │     GradeproImportService (JSON-LD parser)
  │     PicoExportService (Word, RevMan .sof, JSON, ZIP)
  │     PicoController (/api/picos, /api/outcomes)
  │     EvidenceFhirProjection → Evidence + EvidenceVariable resources
  │     CertaintyFhirProjection → ArtifactAssessment (CertaintyOfEvidence)
  │     Events: pico.created, outcome.updated, shadow.accepted
  │
  ├── @app/recommendation-etd ─────────────────────────────────────
  │     RecommendationService, EtdService, DecisionAidGenerator
  │     RecommendationController (/api/recommendations, /api/etd)
  │     DecisionAidController (/api/decision-aids)
  │     RecommendationFhirProjection → PlanDefinition (CPGRecommendation)
  │     EtdFhirProjection → ArtifactAssessment (RecommendationJustification)
  │     Events: recommendation.created, recommendation.strength-changed, etd.judgment-updated
  │
  ├── @app/clinical-integration ───────────────────────────────────
  │     CodingService (BioPortal/FHIR terminology service lookup)
  │     EmrElementService
  │     CodingController (/api/codes, /api/emr-elements)
  │     TerminologyFhirProjection → CodeSystem/ValueSet lookups
  │     Events: code.attached, emr-element.created
  │
  ├── @app/publishing ─────────────────────────────────────────────
  │     VersionService (snapshot creation, FHIR Bundle assembly)
  │     PdfGeneratorService (Puppeteer/Playwright headless Chrome)
  │     WordExportService (docx-js)
  │     WidgetService (embeddable widget URL generation)
  │     SubscriptionService (email notifications)
  │     PublishingController (/api/versions, /api/widgets, /api/export)
  │     VersionFhirProjection → Bundle (type=document)
  │     Events: version.published, guideline.made-public
  │
  ├── @app/collaboration ──────────────────────────────────────────
  │     PermissionService, CoiService, PollService, TaskService
  │     MilestoneService, ChecklistService, CommentService
  │     CollaborationController (/api/permissions, /api/coi, /api/polls, etc.)
  │     CoiFhirProjection → Provenance
  │     AuditFhirProjection → AuditEvent
  │     Events: permission.changed, coi.updated, poll.created, task.assigned
  │
  └── @app/fhir-facade ────────────────────────────────────────────
        FhirController (/fhir/metadata, /fhir/PlanDefinition, /fhir/Evidence, etc.)
        ConformanceService (CapabilityStatement generation)
        FhirBundleService (search result Bundle assembly)
        FhirSearchParser (FHIR search parameter → Prisma query translation)
        
        NOTE: Read-only in Phase 1. Write operations (FHIR POST/PUT) in Phase 3.
```

### 4.2 Cross-Cutting Concerns (Interceptors & Guards)

```typescript
// AuditInterceptor — automatically captures all mutations
// Applied globally via APP_INTERCEPTOR
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  // Captures: HTTP method, route, user, request body, response status
  // Emits ActivityLogEntry for POST/PUT/PATCH/DELETE
  // Extracts entityType and entityId from route params
  // Stores changeDetails by diffing request body against previous state
}

// RbacGuard — enforces guideline-level permissions
@Injectable()
export class RbacGuard implements CanActivate {
  // Reads @Roles('ADMIN', 'AUTHOR') decorator
  // Resolves guidelineId from route params or request body
  // Checks GuidelinePermission table
  // Organization admins bypass guideline-level checks
}

// SoftDeleteInterceptor — converts DELETE to soft-delete UPDATE
@Injectable()
export class SoftDeleteInterceptor implements NestInterceptor {
  // Sets isDeleted = true instead of actual DELETE
  // Emits 'entity.soft-deleted' event for audit trail
}
```

---

## 5. Frontend Architecture (React 19)

### 5.1 Technology Choices

| Concern | Library | Rationale |
|---------|---------|-----------|
| Framework | React 19 | Concurrent features, RSC readiness, largest ecosystem |
| Build | Vite 6 | Fast HMR, ESM-native, excellent DX |
| Routing | TanStack Router | Type-safe routing, search param management, file-based routes |
| State (server) | TanStack Query v5 | Cache management, optimistic updates, offline mutation queue |
| State (client) | Zustand | Lightweight, no boilerplate, middleware for persistence |
| Forms | React Hook Form + Zod | Schema validation, performant, complex nested forms for GRADE |
| Rich Text | TipTap 3 (ProseMirror) | Track changes, comments, collaborative cursors, structured JSON |
| Drag & Drop | dnd-kit | Accessible, performant, handles nested section trees |
| Tables | TanStack Table v8 | Headless, sorting, filtering, for SoF tables and reference lists |
| Charts | Recharts | Pictographs for decision aids, forest plot visualization |
| UI Components | shadcn/ui + Radix primitives | Accessible, composable, no vendor lock-in, Tailwind-native |
| Styling | Tailwind CSS 4 | Utility-first, design tokens for org branding, dark mode |
| Icons | Lucide React | Consistent, tree-shakeable |
| PDF Viewer | react-pdf | For viewing published PDF snapshots |
| Date/Time | date-fns | Lightweight, tree-shakeable |

### 5.2 Application Shell Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Top Bar: Logo | Guideline Title | Version Badge | User Menu    │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  Side  │  Tab Bar: [Recommendations] [Evidence] [References]    │
│  Nav   │  ────────────────────────────────────────────────────  │
│        │                                                        │
│ Section│  Content Area                                          │
│ Tree   │  (context-dependent based on selected tab + entity)    │
│        │                                                        │
│ [+Add] │  ┌──────────────────────────────────────────────────┐  │
│        │  │  Selected Entity Editor                          │  │
│ drag   │  │  (Recommendation panel / PICO editor /           │  │
│ drop   │  │   Reference details / Section text editor)       │  │
│ re-    │  │                                                  │  │
│ order  │  │  Sub-tabs within entity:                         │  │
│        │  │  [Evidence] [Key Info/EtD] [Rationale]           │  │
│        │  │  [Recommendation] [Practical Info] [Decision     │  │
│        │  │   Aids] [EHR & Codes] [Feedback] [Adaptation]    │  │
│        │  └──────────────────────────────────────────────────┘  │
│        │                                                        │
│        │  Activity Bar (collapsible bottom panel):              │
│        │  [Activity Log] [Tasks] [Comments] [Track Changes]    │
├────────┴────────────────────────────────────────────────────────┤
│  Status Bar: Last saved | Editing indicator | Online/Offline    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Key Component Architecture

```
src/
├── app/
│   ├── routes/                          # TanStack Router file-based routes
│   │   ├── __root.tsx                   # Root layout
│   │   ├── index.tsx                    # Dashboard
│   │   ├── guidelines/
│   │   │   ├── $guidelineId/
│   │   │   │   ├── index.tsx            # Guideline overview
│   │   │   │   ├── recommendations.tsx  # Recommendations tab
│   │   │   │   ├── evidence.tsx         # Evidence/PICO tab
│   │   │   │   ├── references.tsx       # References tab
│   │   │   │   ├── settings.tsx         # Settings (10 sub-tabs)
│   │   │   │   └── versions.tsx         # Version history
│   │   │   └── new.tsx                  # Create guideline
│   │   ├── org/
│   │   │   └── $orgId.tsx               # Organization dashboard
│   │   └── public/
│   │       └── $shortName.tsx           # Public guideline viewer (multilayer)
│   │
├── features/                            # Feature modules (mirror backend modules)
│   ├── guideline-authoring/
│   │   ├── components/
│   │   │   ├── SectionTree.tsx          # Recursive drag-drop section tree
│   │   │   ├── SectionEditor.tsx        # TipTap editor for section text
│   │   │   └── GuidelineSettingsForm.tsx
│   │   ├── hooks/
│   │   │   ├── useGuideline.ts          # TanStack Query hook
│   │   │   └── useSections.ts
│   │   └── api/
│   │       └── guideline.api.ts         # API client functions
│   │
│   ├── grade-evidence/
│   │   ├── components/
│   │   │   ├── PicoEditor.tsx           # P/I/C/O form with code autocomplete
│   │   │   ├── OutcomeRow.tsx           # Single outcome in SoF table
│   │   │   ├── SofTable.tsx             # Full Summary of Findings table
│   │   │   ├── GradeAssessment.tsx      # 5 downgrade + 3 upgrade factor panel
│   │   │   ├── ShadowOutcomePanel.tsx   # Green-highlighted update drafts
│   │   │   └── RevmanImportDialog.tsx
│   │   └── ...
│   │
│   ├── recommendation-etd/
│   │   ├── components/
│   │   │   ├── RecommendationEditor.tsx # Strength selector + text editor
│   │   │   ├── EtdFramework.tsx         # Configurable 4/7/12 factor display
│   │   │   ├── EtdFactorCard.tsx        # Individual factor with judgments
│   │   │   ├── JudgmentGrid.tsx         # Multi-intervention comparison grid
│   │   │   ├── DecisionAidPreview.tsx   # Auto-generated layered display
│   │   │   └── PictographDisplay.tsx    # Absolute risk visualization
│   │   └── ...
│   │
│   ├── reference-management/
│   │   ├── components/
│   │   │   ├── ReferenceList.tsx        # Sortable, searchable reference table
│   │   │   ├── ReferenceForm.tsx        # Manual entry + PubMed lookup
│   │   │   ├── BulkEditMode.tsx         # Lock-aware bulk operations
│   │   │   └── DeduplicationTool.tsx    # Similarity-based duplicate finder
│   │   └── ...
│   │
│   ├── publishing/
│   │   ├── components/
│   │   │   ├── VersionHistory.tsx       # Version list with status badges
│   │   │   ├── PublishDialog.tsx        # Major/minor selector + comment
│   │   │   ├── VersionDiff.tsx          # Side-by-side comparison
│   │   │   └── WidgetConfigurator.tsx   # Embed code generator
│   │   └── ...
│   │
│   ├── collaboration/
│   │   ├── components/
│   │   │   ├── ActivityLog.tsx          # Filterable, searchable audit trail
│   │   │   ├── CoiDashboard.tsx         # Member × intervention matrix
│   │   │   ├── PollBuilder.tsx          # Voting/Delphi tool
│   │   │   ├── TaskBoard.tsx            # Kanban-style task management
│   │   │   └── MilestoneTracker.tsx     # Timeline with checklists
│   │   └── ...
│   │
│   ├── clinical-integration/
│   │   ├── components/
│   │   │   ├── CodeAutocomplete.tsx     # SNOMED/ICD/ATC/RxNorm search
│   │   │   └── EmrElementEditor.tsx     # Target population + intervention codes
│   │   └── ...
│   │
│   └── fhir/
│       ├── components/
│       │   └── FhirResourceViewer.tsx   # JSON tree viewer for debugging
│       └── hooks/
│           └── useFhirExport.ts         # Trigger FHIR Bundle download
│
├── shared/
│   ├── components/
│   │   ├── RichTextEditor.tsx           # TipTap wrapper with track changes
│   │   ├── TrackChangesToggle.tsx
│   │   ├── CommentThread.tsx
│   │   ├── StrengthBadge.tsx            # Color-coded GRADE strength display
│   │   ├── CertaintyBadge.tsx           # ⊕⊕⊕⊕ / ⊕⊕⊕◯ style indicator
│   │   ├── StatusLabel.tsx              # Recommendation status (New, Updated, etc.)
│   │   └── MultilayerAccordion.tsx      # Progressive disclosure pattern
│   ├── hooks/
│   │   ├── useAuth.ts                   # Keycloak OIDC context
│   │   ├── usePermissions.ts            # Current user's role for current guideline
│   │   ├── useOptimisticUpdate.ts       # TanStack Query mutation wrapper
│   │   └── usePresence.ts              # Who's editing what (polling-based)
│   └── lib/
│       ├── api-client.ts                # Axios instance with auth interceptor
│       ├── fhir-types.ts                # TypeScript types generated from FHIR R5 schemas
│       └── grade-helpers.ts             # Certainty calculation, effect formatting
│
└── tiptap/
    ├── extensions/
    │   ├── track-changes.ts             # Insertion/deletion marks with author attribution
    │   ├── comments.ts                  # Inline comment marks with threading
    │   ├── citation-link.ts             # Inline reference citation [1] with popover
    │   └── grade-tooltip.ts             # Contextual GRADE help tooltips
    └── schemas/
        ├── section-text.ts              # Schema for section rich text
        ├── recommendation-text.ts       # Schema for recommendation description
        └── narrative-summary.ts         # Schema for PICO narrative
```

### 5.4 TipTap Track Changes Implementation

The rich text editing with per-text-box track changes is the highest-complexity frontend component. The approach:

```typescript
// tiptap/extensions/track-changes.ts
// Based on ProseMirror change tracking with author attribution

// Mark types:
//   insertion: { author: string, timestamp: string, accepted: boolean }
//   deletion:  { author: string, timestamp: string, accepted: boolean }

// When track changes is ON for a user:
//   - New text → wrapped in insertion mark
//   - Deleted text → wrapped in deletion mark (rendered as strikethrough, not removed)
//   - Replaced text → deletion mark on old + insertion mark on new

// When track changes is OFF:
//   - Direct edits, no marks applied

// Accept/Reject operations:
//   - Accept insertion → remove mark, keep text
//   - Reject insertion → remove mark AND text
//   - Accept deletion → remove mark AND text
//   - Reject deletion → remove mark, keep text

// Document JSON stores marks inline with text nodes:
// { type: "text", text: "new content", marks: [{ type: "insertion", attrs: { author: "...", timestamp: "..." }}] }

// The green pen icon (someone else editing) is implemented via usePresence hook:
// Polls /api/guidelines/:id/presence every 30 seconds
// Returns { userId, entityType, entityId, lastActive }
```

---

## 6. API Design

### 6.1 Internal REST API (OpenAPI 3.1)

Base path: `/api/v1`

**Guideline Authoring:**
```
GET    /guidelines                    # List (filtered by org, permissions)
POST   /guidelines                    # Create
GET    /guidelines/:id                # Get with sections tree
PUT    /guidelines/:id                # Update metadata/settings
DELETE /guidelines/:id                # Soft delete
POST   /guidelines/:id/clone          # Clone ("COPY OF ...")
POST   /guidelines/:id/import         # Import from ZIP

GET    /guidelines/:id/sections       # Section tree
POST   /guidelines/:id/sections       # Create section
PUT    /sections/:id                   # Update section
DELETE /sections/:id                   # Soft delete
PUT    /guidelines/:id/sections/reorder  # Batch reorder (accepts ordered ID array)
```

**References:**
```
GET    /guidelines/:id/references     # List with "places used" counts
POST   /guidelines/:id/references     # Create (manual)
POST   /guidelines/:id/references/pubmed   # Import by PubMed ID
POST   /guidelines/:id/references/ris      # Import RIS file
PUT    /references/:id                # Update
DELETE /references/:id                # Soft delete (blocked if "in use")
POST   /guidelines/:id/references/bulk-edit/lock    # Acquire lock
DELETE /guidelines/:id/references/bulk-edit/lock    # Release lock
GET    /guidelines/:id/references/duplicates        # Deduplication checker
```

**GRADE Evidence:**
```
GET    /guidelines/:id/picos          # List all PICOs
POST   /guidelines/:id/picos          # Create
POST   /guidelines/:id/picos/import/revman    # Import .rm5
POST   /guidelines/:id/picos/import/gradepro  # Import JSON-LD
POST   /guidelines/:id/picos/import/zip       # Import MAGICapp ZIP
GET    /picos/:id                     # Get with outcomes
PUT    /picos/:id                     # Update P/I/C, narrative
DELETE /picos/:id                     # Soft delete (with undo capability)
GET    /picos/:id/export/:format      # Export (word, revman, json, zip)

POST   /picos/:id/outcomes            # Create outcome
PUT    /outcomes/:id                   # Update outcome data + GRADE assessment
DELETE /outcomes/:id                   # Soft delete
PUT    /picos/:id/outcomes/reorder     # Batch reorder
POST   /picos/:id/shadows             # Create shadow outcomes from updated RevMan
PUT    /outcomes/:id/accept-shadow     # Accept shadow (replaces original)

GET    /picos/:id/codes               # List terminology codes
POST   /picos/:id/codes               # Attach code
DELETE /pico-codes/:id                 # Remove code

POST   /picos/:id/practical-issues    # Add practical issue
PUT    /practical-issues/:id           # Update
DELETE /practical-issues/:id           # Remove
```

**Recommendations & EtD:**
```
GET    /guidelines/:id/recommendations   # List all
POST   /guidelines/:id/recommendations   # Create
GET    /recommendations/:id              # Get with all sub-tabs
PUT    /recommendations/:id              # Update
DELETE /recommendations/:id              # Soft delete

PUT    /recommendations/:id/picos        # Link/unlink PICOs (array of picoIds)
GET    /recommendations/:id/decision-aid # Get auto-generated decision aid data
GET    /recommendations/:id/version-diff # Compare with previous published version

GET    /recommendations/:id/etd          # Get EtD factors + judgments
PUT    /etd-factors/:id                  # Update factor content
PUT    /etd-judgments/:id                # Update judgment value/color

POST   /recommendations/:id/emr-elements  # Add EMR element
PUT    /emr-elements/:id                   # Update
DELETE /emr-elements/:id                   # Remove
```

**Publishing:**
```
GET    /guidelines/:id/versions         # Version history
POST   /guidelines/:id/versions         # Publish new version (major/minor + comment)
GET    /versions/:id                     # Get version snapshot
GET    /versions/:id/pdf                 # Download PDF
GET    /versions/:id/json                # Download JSON

PUT    /guidelines/:id/public            # Toggle public access
GET    /guidelines/:id/subscribers       # List subscribers
POST   /guidelines/:id/subscribers/notify # Broadcast update notification

GET    /guidelines/:id/widgets/recommendation/:recId  # Widget embed config
GET    /guidelines/:id/widgets/pico/:picoId            # Widget embed config
```

**Collaboration:**
```
GET    /guidelines/:id/permissions      # List all members + roles
POST   /guidelines/:id/permissions      # Add member
PUT    /permissions/:id                 # Change role
DELETE /permissions/:id                 # Remove member

GET    /guidelines/:id/activity         # Activity log (paginated, filterable)
POST   /activity/:id/flag              # Flag for follow-up
POST   /activity/:id/comment           # Add comment to log entry

GET    /guidelines/:id/coi             # COI dashboard data
PUT    /coi-records/:id                # Update COI record
PUT    /coi-conflicts/:id              # Update intervention conflict level
POST   /guidelines/:id/coi/bulk        # Bulk-set conflict levels

POST   /guidelines/:id/polls           # Create poll
GET    /polls/:id                      # Get poll + votes (if permitted)
POST   /polls/:id/vote                 # Submit vote

POST   /guidelines/:id/tasks           # Create task
PUT    /tasks/:id                      # Update task
GET    /guidelines/:id/tasks           # List tasks (filterable)

GET    /recommendations/:id/comments   # Get comment thread
POST   /recommendations/:id/comments   # Add comment
PUT    /comments/:id                   # Update status (resolve/reject)

GET    /guidelines/:id/presence        # Who is editing what (polling endpoint)
POST   /guidelines/:id/presence        # Report current editing state
```

**Clinical Integration:**
```
GET    /codes/search?system=SNOMED_CT&term=diabetes  # Terminology lookup (BioPortal proxy)
```

### 6.2 FHIR Facade API (Phase 1 — Read Only)

Base path: `/fhir`

```
GET    /fhir/metadata                           # CapabilityStatement
GET    /fhir/PlanDefinition/:id                 # Single recommendation
GET    /fhir/PlanDefinition?topic=:code         # Search by clinical code
GET    /fhir/Evidence/:id                       # Single evidence profile
GET    /fhir/EvidenceVariable/:id               # Single PICO element
GET    /fhir/Citation/:id                       # Single reference
GET    /fhir/ArtifactAssessment/:id             # GRADE/EtD assessment
GET    /fhir/Composition/:id                    # Guideline as Composition
GET    /fhir/Bundle/:versionId                  # Published version as document Bundle
GET    /fhir/AuditEvent?entity=:id              # Activity log for entity
```

All FHIR endpoints return `application/fhir+json` with appropriate `Content-Type` headers. Search operations support `_include`, `_revinclude` for fetching related resources. Pagination uses FHIR Bundle `link` navigation.

---

## 7. Deployment Architecture

### 7.1 Docker Compose (Development / Small Org)

```yaml
services:
  # Application
  api:
    build: ./packages/api
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://opengrade:password@db:5432/opengrade
      KEYCLOAK_URL: http://keycloak:8080
      S3_ENDPOINT: http://minio:9000
      REDIS_URL: redis://redis:6379
    depends_on: [db, keycloak, minio, redis]
    
  web:
    build: ./packages/web
    ports: ["5173:80"]   # nginx serving built React app
    
  # Infrastructure
  db:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: opengrade
      POSTGRES_USER: opengrade
      POSTGRES_PASSWORD: password
      
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://db:5432/keycloak
      
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes: ["miniodata:/data"]
    
  redis:
    image: redis:7-alpine
    # Used for: presence tracking, rate limiting, session cache, Bull job queues
    
  # Background workers
  worker:
    build: ./packages/api
    command: node dist/worker.js
    # Handles: PDF generation, RevMan import processing, email notifications
    environment:
      WORKER_MODE: "true"
      # ... same env as api

volumes:
  pgdata:
  miniodata:
```

### 7.2 Monorepo Structure

```
opengrade/
├── packages/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── core/           # @app/core module
│   │   │   ├── guideline-authoring/
│   │   │   ├── reference-management/
│   │   │   ├── grade-evidence/
│   │   │   ├── recommendation-etd/
│   │   │   ├── clinical-integration/
│   │   │   ├── publishing/
│   │   │   ├── collaboration/
│   │   │   ├── fhir-facade/
│   │   │   └── worker/         # Bull queue consumers
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── test/
│   │
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── features/
│   │   │   ├── shared/
│   │   │   └── tiptap/
│   │   └── vite.config.ts
│   │
│   ├── shared/                 # Shared TypeScript types & utilities
│   │   ├── src/
│   │   │   ├── dto/            # Request/Response DTOs (shared between API & web)
│   │   │   ├── fhir-types/     # Generated FHIR R5 TypeScript interfaces
│   │   │   ├── enums/          # Shared enums (mirroring Prisma enums)
│   │   │   └── grade/          # GRADE calculation utilities
│   │   └── package.json
│   │
│   └── widget/                 # Standalone embeddable widget (Preact, <50KB)
│       ├── src/
│       │   ├── RecommendationWidget.tsx
│       │   ├── PicoWidget.tsx
│       │   └── DecisionAidWidget.tsx
│       └── vite.config.ts      # Library mode build
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── turbo.json                  # Turborepo config
├── package.json                # Workspace root
└── docs/
    ├── architecture.md         # This document
    ├── fhir-mapping.md         # Detailed FHIR resource mapping
    └── api-spec.yaml           # OpenAPI 3.1 specification
```

---

## 8. Phased Build Plan

### Phase 1 — Foundation + Authoring MVP (Weeks 1–8)

**Goal**: Author can create a guideline with sections, references, and structured recommendations. Admin can manage permissions and publish a version.

**Backend:**
- @app/core (Auth via Keycloak, RBAC guards, Audit interceptor, S3 storage)
- @app/guideline-authoring (Guideline CRUD, Section tree CRUD with reordering)
- @app/reference-management (Reference CRUD, PubMed import, basic deduplication)
- @app/collaboration (Permissions CRUD, Activity log — auto-captured)
- @app/publishing (Version creation with JSON snapshot, basic PDF generation)

**Frontend:**
- Application shell (sidebar, tab bar, top bar)
- Guideline dashboard + creation flow
- Section tree with drag-and-drop reordering
- TipTap editor for section text (without track changes — Phase 2)
- Reference list + manual entry + PubMed import
- Basic recommendation editor (strength selector, text, linking to section)
- Permission management UI
- Publish dialog (version number, comment)
- Version history list

**Database:** Full schema deployed, but only Phase 1 tables actively used.

**Deliverable:** A functional guideline authoring tool that can create, structure, and publish guidelines with references and basic recommendations.

### Phase 2 — GRADE Evidence Engine (Weeks 9–16)

**Goal**: Full GRADE evidence assessment workflow — PICO questions, outcomes, SoF tables, quality assessment, RevMan import, EtD framework.

**Backend:**
- @app/grade-evidence (PICO CRUD, Outcome CRUD, GRADE assessment, RevMan import, GRADEpro import, export to Word/RevMan/JSON/ZIP)
- @app/recommendation-etd (EtD framework — 4/7/12 factors, judgments, decision aid generation)

**Frontend:**
- PICO editor (P/I/C form, outcome list)
- Summary of Findings table (full GRADE assessment interface per outcome)
- RevMan import wizard
- EtD framework panel (configurable factor count, judgment grid)
- Decision aid preview (layered display, pictographs)
- Track changes in TipTap (full implementation with accept/reject)
- Presence indicators (who's editing what)

**Deliverable:** Complete evidence-to-recommendation pipeline matching MAGICapp's core GRADE workflow.

### Phase 3 — Clinical Integration + FHIR (Weeks 17–22)

**Goal**: Clinical coding, EHR integration elements, FHIR facade API, embeddable widgets.

**Backend:**
- @app/clinical-integration (Terminology service integration, EMR elements)
- @app/fhir-facade (Read-only FHIR endpoints for all resource types)
- @app/publishing (Widget endpoint, subscriber notifications)

**Frontend:**
- Code autocomplete (SNOMED CT, ICD-10, ATC, RxNorm via BioPortal)
- EMR element editor
- FHIR resource viewer (debug tool)
- Widget configurator + embed code generator
- Public guideline viewer (multilayer progressive disclosure)

**Deliverable:** Interoperable platform with FHIR API, clinical coding, and embeddable widgets.

### Phase 4 — Collaboration & Governance (Weeks 23–28)

**Goal**: Full panel collaboration features — COI management, voting/Delphi, tasks, milestones, comments.

**Backend + Frontend:**
- COI dashboard (member × intervention matrix, bulk operations)
- Voting/Delphi tool (poll creation, voting UI with COI display)
- Task manager (Kanban board)
- Milestone tracker with AGREE II / SNAP-IT checklists
- Comment/feedback system with threading and status
- Subscriber management and broadcast notifications

**Deliverable:** Complete governance toolkit for guideline panel management.

### Phase 5 — PWA + Mobile (Weeks 29–34)

**Goal**: Progressive Web App shell with offline reading, Capacitor wrapper for Android/iOS.

- Service worker for offline caching of published guidelines
- PWA manifest + install prompt
- IndexedDB cache layer for TanStack Query
- Offline mutation queue (sync when online)
- Capacitor project setup (iOS + Android)
- Mobile-optimized layouts (responsive breakpoints already in place)
- Push notifications via Capacitor

**Deliverable:** Installable PWA with offline reading; Capacitor-wrapped native apps.

---

## 9. Critical Implementation Notes

### 9.1 RevMan .rm5 Import Parser

RevMan 5 files are **XML with a proprietary schema**. The parser needs to extract:
- Comparison groups → map to PICO (intervention, comparator)
- Outcome entries → map to Outcome entities
- Study data → map to OutcomeReference links
- Effect estimates (OR, RR, MD, SMD) with CIs → map to Outcome effect fields
- Participant counts and study counts

**Not imported** (must be entered manually): baseline risk, GRADE certainty rating, plain language summary, forest plot images, continuous outcome absolute effects, Generic Inverse Variance outcomes.

### 9.2 Reference Auto-Numbering

References are numbered dynamically based on order of first appearance in the section tree. When sections are reordered, reference numbers update automatically. This requires a **depth-first traversal** of the section tree, collecting reference IDs in order, then assigning sequential numbers. The numbering is computed on-read (not stored), ensuring it's always consistent.

### 9.3 Soft Delete and Undo

All content entities use soft delete (`isDeleted = true`). The Activity Log provides undo capability by surfacing soft-deleted items with a "Restore" action. Prisma query middleware automatically filters `isDeleted = false` on all SELECT queries unless explicitly overridden (for admin/activity log views).

### 9.4 FHIR Version Snapshots

When a version is published, the `snapshotBundle` column stores a complete FHIR R5 Bundle of type `document` containing:
- `Composition` (the guideline structure)
- All `PlanDefinition` resources (recommendations)
- All `Evidence` resources (PICO evidence profiles)
- All `EvidenceVariable` resources (P, I, C, O definitions)
- All `Citation` resources (references)
- All `ArtifactAssessment` resources (GRADE + EtD assessments)
- `Organization` and `Practitioner` resources (publisher + authors)

This Bundle is immutable and self-contained — it can be served directly as a FHIR document without querying the live database.

### 9.5 Terminology Service Integration

Rather than hosting terminology databases locally, the platform proxies terminology lookups through **BioPortal REST API** (or alternatively the **FHIR Terminology Service** at tx.fhir.org). The `/api/v1/codes/search` endpoint accepts a code system and search term, caches results in Redis (TTL 24h), and returns standardised `CodeableConcept`-shaped responses. This avoids the overhead of maintaining SNOMED CT / ICD-10 databases locally while remaining standards-compliant.

---

## 10. Logging Strategy

All logging follows structured JSON format via **Pino** (NestJS default logger):

```typescript
// Log levels by environment:
// Development: debug
// Staging: info  
// Production: warn

// All HTTP requests logged with:
// { method, url, statusCode, responseTime, userId, guidelineId }

// All mutations logged with:
// { action, entityType, entityId, userId, changeDetails }

// All errors logged with:
// { error.message, error.stack, requestId, userId }

// Log output: stdout (container logs) → collected by Docker/K8s logging driver
// Production: ship to external aggregator (ELK, Loki, CloudWatch) via fluentd sidecar
```

Background workers (PDF generation, RevMan import, email) log to the same structured format with a `worker` context field for filtering.

---

*This architecture specification is a living document. Update version history below as decisions evolve.*

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-10 | Initial architecture definition |
| 0.1.1 | 2026-03-06 | Added §11 implementation status after full codebase audit |
| 0.1.2 | 2026-03-18 | Updated §11 to reflect current implementation; added §12 Architectural Decision Record; documented deviations from original spec |

---

## 11. Implementation Status (as of 2026-03-18)

This section documents what has been built, what is partially built, and what is still pending. Cross-reference with `implementation-task-list.md` for sprint-ready task breakdowns and the bug/gap registry.

### 11.1 What Is Fully Implemented

**Infrastructure & Platform Foundation**

| Layer | Component | Notes |
|-------|-----------|-------|
| Infra | Docker Compose (PostgreSQL, Keycloak, MinIO) | Dev stack fully functional |
| Infra | Prisma schema + 2 migrations | `20260306000000_init` + `20260311000000_add_pdf_export_job` |
| Infra | Database seed script | Default roles, enums, sample organization |
| Backend | NestJS 11 + Pino + Helmet + CORS + global ValidationPipe | Structured logging with correlation IDs |
| Backend | Global AuthGuard (APP_GUARD) + @Public() decorator | All endpoints require auth by default |
| Backend | Global ThrottlerGuard (100 req/min) | Rate limiting via @nestjs/throttler |
| Backend | Global ActivityLoggingInterceptor (APP_INTERCEPTOR) | Logs POST/PUT/PATCH/DELETE best-effort |
| Backend | OpenAPI/Swagger documentation | Available at `/api/docs` |

**Core Domain Modules (API)**

| Module | Endpoints | Notes |
|--------|-----------|-------|
| Auth | `GET /auth/me`, `GET /auth/status` | Keycloak JWT guard; @Public() on status |
| Organizations | Full CRUD | Pagination, multi-tenant context |
| Guidelines | Full CRUD + settings + status transitions + stats + slug resolution + validation + import + export | `PUT /guidelines/:id/status`, `PUT /guidelines/:id/public`, `GET /guidelines/stats`, `GET /guidelines/by-slug/:shortName`, `GET /guidelines/:id/validate`, `POST /guidelines/import`, `GET /guidelines/:id/export`, `POST /guidelines/:id/restore` |
| Sections | Full CRUD + reorder + restore | Recursive tree built in memory; `POST /sections/reorder`, `POST /sections/:id/restore` |
| Recommendations | Full CRUD + status transitions + decision aid + EMR elements | `PUT /recommendations/:id/status`, `GET /recommendations/:id/decision-aid`, CRUD for `/recommendations/:id/emr-elements` |
| PICOs | Full CRUD + codes + practical issues (16 categories) | `POST/GET/DELETE /picos/:id/codes`, CRUD for `/picos/:picoId/practical-issues` |
| Outcomes | Full CRUD + shadow outcomes | `POST /outcomes/:id/shadow`, `POST /outcomes/:id/promote`, `GET /outcomes/:id/shadows` |
| References | Full CRUD + auto-numbering + file attachments | `GET /references/numbered?guidelineId=`, multipart upload/download/delete for `/references/:id/attachments` |
| Links | Section↔Reference, Section↔Pico, Section↔Recommendation, Recommendation↔Pico, Outcome↔Reference | Upsert + delete + list for 5 join tables |
| EtD Framework | `GET /recommendations/:id/etd`, factor CRUD, judgment CRUD | 13 factor types; per-intervention judgments; 4/7/12-factor modes |
| Versions | Publish (major/minor) + list + compare + export | `POST /versions`, `GET /versions?guidelineId=`, `GET /versions/compare?v1=&v2=`, `GET /versions/:id/export/json`; snapshot stored in S3 |
| Activity | Filtered audit log | `GET /activity?guidelineId=` with entity/action/text filters |
| Comments | Threaded comments with status workflow | Full CRUD with threading; OPEN/RESOLVED/REJECTED status transitions |
| COI | Conflict of interest declarations | Full CRUD with conflict types and voting exclusion flag |
| Polls | Poll creation + voting + COI exclusion check | OPEN_TEXT, MULTIPLE_CHOICE, STRENGTH_VOTE, ETD_JUDGMENT types; vote tallying; poll close |
| Milestones | Milestone tracking with checklist items | AGREE II / SNAP-IT / CUSTOM categories; checklist toggle |
| Tasks | Kanban task management | TODO/IN_PROGRESS/DONE status; assignee + due date |
| FHIR | Read-only facade + validation + ETag support | `GET /fhir/Composition/:id`, `/Citation/:id`, `/PlanDefinition/:id`, `/Evidence/:id`, `/Bundle/:guidelineId`; `POST /fhir/$validate`; conditional requests with ETag/If-None-Match |
| Terminology | Code search (stub) | `GET /terminology/search?system=&query=&limit=`; hardcoded stub data (~20 codes/system) |
| Storage | S3-compatible object storage | MinIO for dev; version snapshots + reference attachments |
| PDF Export | Async pipeline with template options | `POST /guidelines/:id/export/pdf` (creates job), `GET /pdf-jobs/:jobId` (poll), `GET /pdf-jobs/:jobId/download` (stream); pdfmake-based; TipTap JSON → PDF conversion |
| DOCX Export | Synchronous Word export | `GET /guidelines/:id/export/docx`; `docx` library; matches PDF structure |
| Clinical Codes | Aggregation endpoint | `GET /guidelines/:id/clinical-codes` (PicoCodes + EmrElements) |
| Health | Readiness probe | `GET /health/ready` with DB connectivity check |
| Permissions | RBAC matrix enforcement | `RbacGuard` with `@Roles()` on all 9 mutation controllers; `PermissionManagementPanel` UI |

**Frontend (React + Vite)**

| Component | Status | Notes |
|-----------|--------|-------|
| AppShell | Fully wired | Sidebar nav (Dashboard, Guidelines, References), user info from `useAuth`, logout button |
| DashboardPage | Live stats | Fetches counts via `useDashboardStats` → `GET /guidelines/stats` |
| GuidelinesPage | Full CRUD | Inline "New Guideline" form (title + shortName); status badges; click to open workspace |
| ReferencesPage | Full cross-guideline view | Server-side search, pagination, grouped by guideline, places-used badges (sections + outcomes) |
| GuidelineWorkspacePage | 10-tab workspace | Recommendations, Evidence (PICO), References, Settings, Versions, Tasks, Polls, Milestones, COI, Activity |
| SectionTree | Fully interactive | Drag-and-drop (dnd-kit), expand/collapse, auto-numbering, add/delete with confirm |
| SectionDetailPanel | Complete | Rich text editor, child section navigation, recommendation CRUD |
| RecommendationEditorCard | 4 sub-tabs | Narrative (description/remark/rationale/practicalInfo), Key Info/EtD, Comments, Decision Aid |
| PicoBuilderPanel | Complete | PICO CRUD, outcomes with GRADE, codes (4 systems), practical issues (16 categories), shadow outcomes |
| GradeAssessmentPanel | Complete | Evidence, GRADE (5 downgrade + 3 upgrade), Summary tabs; certainty symbols |
| EtdPanel | Complete | 4/7/12-factor modes; judgment grid; rich text editors |
| DecisionAidPreview | Complete | Overview, Benefits & Harms with pictograph, Full Evidence layers |
| PictographDisplay | Complete | Paired icon-array panels showing baseline vs intervention absolute risk per 100 |
| ReferenceList | Complete | Add/edit/delete, link to sections/outcomes, expandable details, DOI/PubMed links |
| CommentsPanel | Complete | Threaded display, reply forms, status badges, resolve/delete |
| CoiDashboard | Complete | Conflict type badges, voting exclusion, inline create/edit |
| PollsPanel | Complete | 4 poll types, voting, results, close/delete |
| MilestonesPanel | Complete | Progress bar, timeline, checklist items with toggle |
| TaskBoard | Complete | 3-column Kanban, task cards, assignee, due date color-coding |
| VersionHistoryPanel | Complete | Version list, publish, compare, JSON export, read-only banner |
| GuidelineSettingsPanel | Complete | All settings fields, permission management, recovery, PDF/DOCX export buttons |
| ActivityLogPanel | Complete | Entity/action type filters, text search, pagination, relative timestamps |
| RichTextEditor | Complete | TipTap + StarterKit, save-on-blur, JSON serialization |

**Testing**

| Category | Count | Notes |
|----------|-------|-------|
| API unit tests | 64 | All services and most controllers |
| Frontend unit tests | 68 | Components and hooks |
| PDF export tests | 30 | 19 generator + 11 service |
| E2E tests (Playwright) | 65 | Navigation, dashboard, guidelines, workspace, references |

### 11.2 Partially Implemented

| Component | Status | Remaining Gap |
|-----------|--------|---------------|
| Terminology lookup | Hardcoded stub data | Needs BioPortal API proxy + Redis cache |
| Track changes (TipTap) | TipTap installed with StarterKit | Track changes extension not installed; no accept/reject workflow |
| Collaborative cursors | Not started | Needs WebSocket/Y.js integration |
| `packages/fhir` | Stub types only | No shared FHIR serializers (projection lives in `apps/api/src/fhir/`) |
| `packages/ui` | Only `cn()` utility | No extracted shared components |
| COI intervention matrix | Simple CRUD exists | Spec describes auto-populated intervention×member matrix from PICOs; not implemented |
| Voting exclusion | Basic check exists | `PollsService.castVote` checks flag; no granular per-intervention exclusion |
| Reference deduplication on import | Import creates new references | No DOI/PMID dedup during `POST /guidelines/import` |

### 11.3 Not Yet Started

| Capability | Architecture Section | Notes |
|------------|---------------------|-------|
| RevMan (.rm5) import | §9 | No parser, import wizard, or background job |
| Embeddable decision-aid widget | §9 | `packages/widget` Preact micro-bundle does not exist |
| Multilingual UI (i18n) | §8 | Language field on Guideline exists; no i18n framework for UI |
| PWA / offline | §1 | No service worker, no IndexedDB cache, no Capacitor |
| Capacitor mobile wrapper | §1 | Phase 2 — no implementation |
| Performance tests | §10 | No load/stress testing |
| Backup/restore jobs | §10 | No scheduled DB/S3 backup |
| Runtime dashboards | §10 | No APM/metrics (Prometheus, Grafana) |
| Deployment runbooks | §10 | No K8s Helm chart or deployment documentation |
| Guideline clone (deep copy) | §4 | Service method not implemented |
| Guideline ZIP import | §4 | Only JSON import exists |
| COI document upload to S3 | §6 | COI module has no file upload |
| COI FHIR Provenance projection | §6 | No FHIR mapping for COI records |
| Subscriber/notification management | §6 | Schema fields exist; no notification service |
| Event-driven cross-module communication | §1.3 | Direct service injection used; no EventEmitter2 |

---

## 12. Architectural Decision Record

This section documents architectural decisions made during implementation that deviate from or clarify the original specification. Each decision is recorded with context and rationale.

### ADR-001: npm Workspaces Instead of Turborepo

**Context**: Task 0.1.1 specified Turborepo for monorepo orchestration.
**Decision**: npm workspaces used instead.
**Rationale**: npm workspaces provide sufficient workspace resolution for the current project scale without adding a build orchestrator dependency. Turborepo can be adopted later if build performance becomes a bottleneck.
**Impact**: No `turbo.json` exists. Build/test/lint are run per-package via npm scripts.

### ADR-002: Flat NestJS Module Structure

**Context**: Spec §1.3 and task files describe a nested module structure (`src/core/`, `src/guideline-authoring/`, `src/grade-evidence/`, `src/recommendation-etd/`, `src/collaboration/`, etc.).
**Decision**: Flat module structure at `src/` root level — each domain concept is a top-level directory (e.g., `src/guidelines/`, `src/recommendations/`, `src/picos/`, `src/coi/`).
**Rationale**: Simplicity. Each module is small enough that grouping into meta-directories adds navigational overhead without clarity benefit. NestJS module imports provide the dependency graph.
**Impact**: 22 top-level directories under `src/` instead of ~9 grouped directories.

### ADR-003: Direct Service Injection Instead of EventEmitter2

**Context**: Spec §1.3 mandates cross-module communication via NestJS EventEmitter2 async events "enabling future extraction to microservices."
**Decision**: Modules import and inject each other's services directly.
**Rationale**: EventEmitter2 adds indirection and makes debugging harder for the current monolith. The project is not planning microservice extraction in the near term. Direct injection is type-safe and traceable.
**Impact**: No `@nestjs/event-emitter` installed. No event listeners. Module coupling is explicit via NestJS imports.

### ADR-004: Database-Backed PDF Job Queue Instead of Bull/Redis

**Context**: Spec and task files reference Bull queue with Redis for background jobs (PDF generation, RevMan import).
**Decision**: PDF generation uses a database-backed job model (`PdfExportJob` Prisma model) with PENDING→PROCESSING→COMPLETED→FAILED status tracking. No Bull, no Redis.
**Rationale**: Avoids introducing Redis as an additional infrastructure dependency for MVP. The job volume is low (PDF exports are infrequent). Database-backed polling is simple and sufficient.
**Impact**: No `@nestjs/bull` installed. PDF jobs are processed in-process (not a separate worker). Job polling via `GET /pdf-jobs/:jobId`. `PdfExportJob` model added in migration `20260311000000_add_pdf_export_job`.

### ADR-005: pdfmake (Pure JS) for PDF Generation

**Context**: Architecture does not specify a PDF generation library.
**Decision**: Using `pdfmake` v0.3 — a pure JavaScript PDF generation library.
**Rationale**: No browser/Puppeteer dependency required. Works in any Node.js environment without Chrome/Chromium. Supports programmatic document construction with rich formatting (bold, italic, lists, tables, page headers/footers).
**Impact**: PDF generation is synchronous and CPU-bound. TipTap JSON is converted to pdfmake document definition via custom converter in `PdfGeneratorService`.

### ADR-006: `packages/fhir` + `packages/ui` Instead of `packages/shared`

**Context**: Task 0.1.2 specifies a single `packages/shared` library containing DTOs, FHIR types, enums, and GRADE models.
**Decision**: Split into two packages: `packages/fhir` (FHIR type definitions) and `packages/ui` (shared UI utilities).
**Rationale**: Separation of concerns — FHIR types are backend-oriented while UI utilities are frontend-oriented. Prevents backend dependencies leaking into the frontend bundle.
**Impact**: Both packages are currently stubs. FHIR projection logic lives in `apps/api/src/fhir/`. Shared enums are defined inline in each package rather than centralized.

### ADR-007: Zustand for Client-Side Auth State

**Context**: Architecture spec does not prescribe a state management solution.
**Decision**: Zustand store for auth state (user, token, logout). React Query (TanStack Query) for all server state.
**Rationale**: Zustand is lightweight (< 1KB) and simpler than React Context for global singleton state like auth. React Query handles all API caching, refetching, and optimistic updates.
**Impact**: `useAuth` hook wraps a Zustand store. Token stored in `localStorage`. Axios interceptor attaches Bearer token to requests.

### ADR-008: Custom Routing via App.tsx

**Context**: Standard React applications use React Router for client-side routing.
**Decision**: Custom path-based routing implemented directly in `App.tsx`.
**Rationale**: The application has only 4 top-level pages with simple path matching. A full router library was deemed unnecessary overhead.
**Impact**: No `react-router-dom` dependency. Route changes use `window.location` or browser navigation. No nested route support.

### ADR-009: Global Activity Interceptor Instead of Per-Module Events

**Context**: Spec §6 describes activity logging as an interceptor-based approach; task files describe per-module event-driven logging.
**Decision**: Single global `ActivityLoggingInterceptor` registered as `APP_INTERCEPTOR` that intercepts all POST/PUT/PATCH/DELETE requests.
**Rationale**: A global interceptor provides consistent audit coverage without requiring each module to emit events. Best-effort — failures do not block the original request.
**Impact**: All mutations are logged automatically. Entity type and ID are inferred from the request path. User ID comes from the JWT context. No module-specific event emitters needed.

### ADR-010: FHIR Projection in API App Instead of Shared Package

**Context**: Spec §1.3 describes each module owning its FHIR projection service. Task 0.1.2 places FHIR serializers in `packages/shared`.
**Decision**: FHIR projection services live in `apps/api/src/fhir/` as a single module with 4 projection services: `guideline-to-composition.ts`, `recommendation-to-plan-definition.ts`, `pico-to-evidence.ts`, `reference-to-citation.ts`.
**Rationale**: FHIR projection is server-only logic that depends on Prisma models. Placing it in a shared package would require abstracting away the ORM layer. Centralizing projections in one module makes it easier to maintain FHIR compliance across resource types.
**Impact**: The `FhirModule` depends on multiple domain modules' services via direct injection.

### ADR-011: Comprehensive Version Snapshots as Structured JSON

**Context**: Spec §9.4 describes version snapshots as FHIR Bundle documents.
**Decision**: Version snapshots are stored as structured JSON containing all domain data (guideline metadata, sections tree, recommendations with EtD factors, PICOs with outcomes/codes/practical issues, references). FHIR Bundle transformation is deferred.
**Rationale**: Structured JSON preserves all domain-specific fields that may not have FHIR equivalents (e.g., practical issues, EtD judgments, UI settings). FHIR Bundle export is available separately via `GET /fhir/Bundle/:guidelineId`.
**Impact**: `VersionsService.publish()` creates a comprehensive JSON snapshot uploaded to S3. FHIR transformation is a separate read-time operation.
