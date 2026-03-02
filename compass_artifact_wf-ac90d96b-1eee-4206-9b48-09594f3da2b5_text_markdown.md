# MagicApp: Complete Technical Specification for Open-Source Replication

**MAGICapp is a Java EE monolithic web application built on Spring/Dojo/MySQL/AWS that implements the GRADE methodology for clinical practice guideline authoring, publishing, and living updates.** No open-source equivalent exists. This specification documents the full data model, feature set, business logic, integrations, and architecture extracted from 19 primary documentation sources, academic papers, API references, and the help center — providing everything needed to build an open-source alternative.

The platform was created in 2013 by Per Olav Vandvik, Linn Brandt, Gordon Guyatt, and Thomas Agoritsas under the MAGIC Evidence Ecosystem Foundation (Norwegian non-profit, est. 2018). It serves WHO, BMJ Rapid Recommendations, the Australian Living Evidence Collaboration, and dozens of national guideline organizations. The name stands for **"Making GRADE the Irresistible Choice."**

---

## 1. Technology stack and infrastructure architecture

### Core stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript, **Dojo Toolkit** |
| Backend | **Java EE**, **Spring Framework** |
| Application Server | Apache Tomcat |
| Database | **MySQL** (ACID-compliant), **Hibernate** ORM |
| Operating System | Linux |
| Cloud | **Amazon Web Services** (AWS) |
| Identity Management | **Keycloak** (added v11, June 2022) |
| Architecture Pattern | Monolithic Java EE application |
| Delivery Model | SaaS — browser-based, no client installation |

### Infrastructure and security

All servers sit behind at least one firewall, with data servers not accessible from the public internet. **Hourly database snapshots are retained for 35 days.** All application logs are maintained on a separate logging server. Servers are patched weekly. Application secrets are vaulted. Staff access requires MFA. The platform passed a WHO two-week penetration test.

Security controls include **TLS 1.2** transport encryption, **bCrypt** password hashing, CSRF protection, SQL injection prevention via parameterized queries, XSS prevention via allow-list sanitization, and strong Content Security Policy rules. The database is encrypted at rest. Only email addresses and display names are stored as personal data. File uploads are scanned for malware. Organizations can enforce 2FA (Free OTP or Google Authenticator).

Authentication supports federated identity via **Cochrane ID, WHO, and Google accounts**, all managed through Keycloak. API authentication requires separate credentials obtained from MAGIC support.

### Deployment characteristics

The application follows a **soft-delete pattern** — deleted data is marked as deleted but retained, allowing users to restore deleted PICOs and recommendations. All published versions are retained in their entirety as database records plus PDF snapshots. The platform supports a progressive web app mode for mobile with offline content viewing capability.

---

## 2. Complete data model and entity relationships

### Entity hierarchy

```
Organization
  └── Guideline (or Evidence Summary)
        ├── Settings (10 tabs: General, Customization, Permissions, COI,
        │            Publishing, Milestones, Voting, Tags, Word Export, PDF)
        ├── Sections (recursive nesting: section → sub-section → sub-sub-section)
        │     ├── Section Text (rich text with track changes)
        │     ├── References (0..n)
        │     ├── PICOs / Evidence Profiles (0..n)
        │     └── Recommendations (0..n)
        ├── References Tab (guideline-level reference library)
        ├── Evidence Tab (guideline-level PICO listing)
        └── Recommendations Tab (guideline-level recommendation listing)
```

Three author-facing content tabs exist: **Recommendations** (primary), **Evidence** (PICOs), and **References**. Public/reader view shows only the Recommendations tab. Content is created independently in each tab, then **linked together** during authoring.

### Entity specifications

**Organization**
- Name, description, logo, custom colors
- Admin list (organization-level admins)
- Guidelines overview dashboard (IDs, links, start dates, public status, last edit, recommendation/PICO counts)
- GRADE strength label customization (e.g., "Conditional" instead of "Weak")

**Guideline**
- Title, status, owner (Organization or Personal), language (15 options), description, disclaimer, funding/sponsor statement, contact information, start date
- Logo inherited from Organization
- Unique persistent ID (permalink) plus version-specific IDs
- Tags for recommendation filtering
- Cover page and end page (PDF customization)
- Guideline types: **Personal** (no publishing, no public access — for training/testing), **Organizational** (full capabilities), **Evidence Summary** (standalone without recommendations, can be made public by personal accounts)

**Section**
- Title, section text (rich text), ordering position (drag-and-drop), nesting level, section numbering toggle
- Sections can be excluded from auto-numbering individually
- Parent section reference (nullable for recursive nesting)
- Business rule: sub-section numbering cannot be excluded if parent is numbered

**Reference**
- Title, authors, year, abstract, PubMed ID (8-digit), DOI, URL, study type enum {Primary Study, Systematic Review, Other}
- Auto-numbered (re-numbers dynamically when sections move or references are added/deleted)
- Attached files (PDFs, images, Excel, Word — visible only to admins/authors)
- "Places used" tracking — shows where each reference is linked
- Import methods: Manual, PubMed ID, RIS file, RevMan .rm5 file
- Business rule: References "in use" (linked to PICOs) **cannot be deleted**
- Bulk editing mode: locks guideline for other authors; expires after 24 hours; admin can override

**PICO (Evidence Profile / Summary of Findings)**
- Population (P), Intervention (I), Comparator (C) — all text fields
- Outcomes (O) — ordered list of Outcome sub-entities
- Narrative summary (rich text)
- PICO codes (multiple terminology codes from SNOMED CT, ICD-10, ATC, RxNorm)
- Practical issues (up to **16 categories** from grounded theory research)
- Import sources: RevMan 5, GRADEpro GDT (JSON-LD), MAGICapp Zip
- Export formats: Word, RevMan .sof, JSON, MAGICapp Zip
- Activity log (per-PICO audit trail)

**Outcome** (sub-entity of PICO)
- Title, type enum {Dichotomous, Continuous, Narrative/Non-poolable, Qualitative Findings (CERQual)}
- **Type is immutable after creation** — must delete and re-create to change
- State enum {Under development, For review, Updated, Finished}
- Ordering: within type group only (Dichotomous → Continuous → Non-poolable)
- Data columns: Description, Study Results & Absolute Effect Estimates (linked references, relative effect, baseline risk), GRADE Assessment (5 downgrade + 3 upgrade factors), Plain Language Summary
- Panel importance rating
- Forest plots (manual image attachment)
- Shadow outcomes (green-highlighted update drafts for evidence refresh)
- Effect measures supported: Relative Risk, Odds Ratio, Hazard Ratio, Mean Difference, Standardized Mean Difference, Protective Efficacy
- Business rule: Generic Inverse Variance outcome type is **not supported**

**Recommendation**
- Recommendation text (rich text)
- Strength/Type enum: {Strong For, Conditional/Weak For, Conditional/Weak Against, Strong Against, Not Set} plus non-GRADE types: {Practice Statement, Statutory Requirement, Information Box, Consensus Statement, No-label}
- Header (optional short navigation text), Remark (optional critical info shown at top level)
- Status enum: {New, Updated, In review, Possibly outdated, Updated evidence, Reviewed, No-label} — each with optional date and comment
- Certainty of evidence display (can be shown in strength label)
- Tags (for filtering)
- Rationale/justification (rich text)
- Practical information (rich text — risk scores, drug dosing, links, patient leaflets)
- Hidden flag (can be excluded from published versions)
- Ordering position, version-specific ID, persistent ID

Sub-tabs within each Recommendation:
1. Research Evidence (linked PICOs)
2. Key Information / Evidence to Decision
3. Rationale/Justification
4. Recommendation (strength + text)
5. Practical Information
6. Decision Aids (auto-generated)
7. EHR and Codes (EMR elements)
8. Feedback/Comments
9. Adaptation
10. Research Needs, Implementation, Evaluation (v10.3+)

Deep linking URL suffixes: `/ki`, `/da`, `/pi`, `/rationale`, etc.

### Complete relationship map

```
Organization (1) ──── (n) Guideline
Guideline (1) ──── (n) Section
Section (1) ──── (n) Section [recursive parent-child]
Section (1) ──── (n) Reference [contains]
Section (1) ──── (n) PICO [contains]
Section (1) ──── (n) Recommendation [contains]
PICO (1) ──── (n) Outcome
PICO (n) ──── (n) Recommendation [many-to-many]
PICO (1) ──── (n) PICOCode [terminology codes]
PICO (1) ──── (n) PracticalIssue [16 categories]
Reference (n) ──── (n) Outcome [study results source]
Reference (n) ──── (n) Recommendation [evidence link]
Reference (n) ──── (n) TextCitation [inline citations in any text]
Recommendation (1) ──── (1) EtDAssessment [embedded]
EtDAssessment (1) ──── (n) EtDFactor [4, 7, or 12 factors]
EtDFactor (1) ──── (n) EtDJudgment [per intervention, color-coded]
Recommendation (1) ──── (n) EMRElement [target population + intervention codes]
Recommendation (1) ──── (n) DecisionAid [auto-generated from linked PICOs]
Recommendation (1) ──── (n) Tag
Recommendation (1) ──── (n) FeedbackComment [threaded, with status]
Guideline (1) ──── (n) UserPermission [role-based]
Guideline (1) ──── (n) Version [published snapshots]
Guideline (1) ──── (n) Poll [voting/Delphi]
Guideline (1) ──── (n) Milestone [custom project tracking]
Guideline (1) ──── (n) ChecklistItem [AGREE II / SNAP-IT based]
Guideline (1) ──── (n) COIRecord [per member per intervention]
Guideline (1) ──── (n) Task [assignee, due date, status]
All entities ──── ActivityLogEntry [full audit trail]
```

---

## 3. GRADE methodology implementation

### Quality of evidence assessment

The platform implements the full **GRADE framework** (Grading of Recommendations Assessment, Development and Evaluation). Evidence quality starts at HIGH for RCTs and LOW for observational studies, then is adjusted:

**Five factors that lower certainty**: Risk of Bias (using Cochrane risk-of-bias tool, 6 criteria per study, 5 principles for cross-study judgment), Inconsistency (4 criteria: point estimate variability, CI overlap, heterogeneity P-value, I² statistic — interpreted as <40% low, 30-60% moderate, 50-90% substantial, 75-100% considerable), Indirectness (population/intervention/comparator/outcome differences from question), Imprecision (CI width relative to clinical decision thresholds, Optimal Information Size), and Publication Bias (funnel plots, registry searches).

**Three factors that raise certainty** (primarily for observational studies): Large magnitude of effect (RR 2–5 or 0.2–0.5 with no plausible confounders), dose-response gradient, and all plausible confounders would reduce the demonstrated effect.

**Four certainty levels**: High, Moderate, Low, Very Low. Contextual GRADE help tooltips are embedded throughout the authoring interface. Plain language summary suggestions are organized by certainty level and effect size.

### Evidence to Decision (EtD) framework

Three configurable modes per guideline (set by admin, switchable without data loss):

**4-Factor Summary (Original GRADE):**
1. Benefits & Harms
2. Quality of Evidence / Certainty of Effect Estimates
3. Preferences and Values
4. Resources and Other Considerations

**7-Factor Expanded:**
Adds Equity, Acceptability, and Feasibility to the original four.

**12-Factor Full (via Epistemonikos iEtD integration from DECIDE project):**
Benefits/Harms split into Desirable Effects, Undesirable Effects, Balance; Resources split into Resources Required, Certainty of Resources, Cost-effectiveness; plus Equity, Acceptability, Feasibility.

Each factor stores: **summary text** (rich text), **confidence/gist label** (color-coded visual indicator), **research evidence text** (separate field), **additional considerations text** (separate field), **judgments** (per intervention, color-coded dropdown), and a **visibility toggle** (public vs. internal, per field). The EtD supports **multiple interventions/comparisons** simultaneously, with a Summary of Judgments grid where interventions can be re-arranged for ranking discussions. Judgments persist even if a linked PICO is removed and re-added.

### CERQual for qualitative evidence

Added in v12.0, the **GRADE-CERQual** (Confidence in the Evidence from Reviews of Qualitative research) framework extends the platform to support qualitative evidence synthesis alongside quantitative GRADE assessments.

---

## 4. Role-based access control model

### Two-tier role system

**Organization-level**: Organization Admin — creates guidelines, manages the org control panel, automatically gets access to all organization content, can publish any org-affiliated guideline.

**Guideline-level** (four roles plus public):

| Capability | Admin | Author | Reviewer | Viewer | Public |
|-----------|-------|--------|----------|--------|--------|
| Create/edit content (recommendations, PICOs, sections, references) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish guidelines | ✅ | ❌ | ❌ | ❌ | ❌ |
| Toggle public access | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage permissions (add/remove users, change roles) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit guideline settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage COI | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit milestones/checklists | ✅ | View | View | View | ❌ |
| Create polls (voting/Delphi) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete others' comments | ✅ | ❌ | ❌ | ❌ | ❌ |
| Set track changes default | ✅ | ❌ | ❌ | ❌ | ❌ |
| Break bulk edit locks | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export to Word/PDF/JSON | ✅ | ✅ | ❌ | ❌ | ❌ |
| Use track changes | ✅ | ✅ | View | ❌ | ❌ |
| Leave comments/feedback | ✅ | ✅ | ✅ | ✅ | If enabled |
| View draft content | ✅ | ✅ | ✅ | ✅ | ❌ |
| View published/public content | ✅ | ✅ | ✅ | ✅ | ✅ |

### Permission scoping rules

Users added to a **draft** persist in all subsequent versions. Users added to a specific **published version** only access that version. Personal guideline accounts cannot publish, make guidelines public, or invite viewers/co-authors. **Organization admins automatically receive access to all organization content** without manual addition.

---

## 5. Version control and publishing workflow

### Version numbering model

Versions follow **major.minor** sequential format: v0.0 (initial draft), v0.1/v0.2 (development milestones), v1.0 (first public release), v1.1/v1.2 (corrections), v2.0 (significant update). Each publish creates an immutable snapshot with a version comment.

### State machine

```
[DRAFT v0.0] (grey label)
    ├──(Publish minor)──→ [Published v0.1] (blue label) → auto-creates new DRAFT
    ├──(Publish major)──→ [Published v1.0] (blue label) → auto-creates new DRAFT
    └──(Toggle Public)──→ [Published v1.0 + PUBLIC] (green label)
    
When new version published:
  Previous version → [OUT OF DATE] (red label)
  New editable DRAFT auto-created from snapshot
```

### Critical business rules

**Publishing ≠ Making Public** — these are two independent actions. Published versions are **immutable** — clicking Edit on an old version redirects to the current draft. There is **no revert** capability — forward-only versioning. Once a guideline is public, the most recent published version **must remain public** — internal-only versions cannot be published after going public. Each published version stores: version number, publication date, version comment, public access flag, unique URL, auto-generated PDF, auto-generated JSON data file, and a separate permission list.

### Living guideline mechanisms

Individual recommendations carry status labels (New, Updated, In review, Possibly outdated, Updated evidence, Reviewed) with dates and comments. Individual outcomes carry states (Under development, For review, Updated, Finished). The **"Compare recommendation versions"** feature shows diffs between versions. Widgets can be configured to always show the latest version, so future updates **automatically propagate** to embedded widgets on external sites. Users can subscribe to guideline updates; admins manage the subscriber list and can broadcast messages.

---

## 6. Audit trail and concurrent editing

### Activity log

**Always on** (unlike track changes which can be toggled). Every action is recorded with: user identity, timestamp, action type, target item (drillable to finest granularity), viewable change details, flag for follow-up, and a comment field. Operations include free-text search, filter by user, filter by item, filter by type, view details, navigate to changed item, **un-delete** (recover deleted items), and flag for follow-up.

Context-specific activity logs exist per PICO, per recommendation, per section, and per outcome — accessible via Options → "Activities, tasks and stats."

### Concurrent editing strategy

The platform uses an **optimistic concurrency approach** with visual indicators rather than true real-time collaborative editing like Google Docs. A **red pen icon** replaces the normal gray pen on items being edited by another author, with hover tooltip showing who is editing. The activity log badge shows a count of new edits in real-time. **No lock prevents simultaneous editing of the same text box** — the system relies on visual cues and social coordination.

**Bulk Reference Editing Mode** is the one pessimistic locking mechanism: it locks section/reference structural operations for all other authors (24-hour expiry, admin override). Other authors can still edit PICOs, recommendations, section text, and reference details during a bulk edit lock.

### Track changes system

Works like Microsoft Word per-text-box. Green text = additions, red strikethrough = deletions, yellow highlight = comments. Granularity toggles exist at three levels: per text-box, per user per guideline, and per guideline for all users (admin setting). Track changes **do not appear in published guidelines** but can optionally appear in PDF/Word exports. A green pen+lines icon appears on items with unresolved changes.

---

## 7. Evidence management workflows

### Systematic review and reference import

Four reference import methods: **manual entry**, **PubMed ID** (auto-populates all fields), **RIS file** (from Endnote, Mendeley, RefWorks, Epistemonikos, Ovid, Covidence — must be .ris extension), and **RevMan .rm5 file** (with meta-analysis data).

When importing from RevMan, the system extracts: effect estimates (OR, RR, MD, SMD), participant counts, study counts, individual study data, and absolute effect estimates (**dichotomous only, not continuous**). Items **not** imported from RevMan: baseline risk, quality/certainty rating, plain language summary, forest plot images, Generic Inverse Variance outcomes.

### RevMan update workflow ("Create Shadows")

When evidence is updated, the "Create Shadows" feature manages the transition. Updated outcomes appear as **green-highlighted shadow rows** with the new data. Each shadow can be accepted as-is, edited before accepting, or excluded via "Fix match." **Critical constraint**: the updated RevMan file **cannot have the same filename** as the original.

### Reference deduplication

A basic similarity-based checker using **three matching criteria**: reference title similarity, DOI matching, and PubMed ID matching. The tool shows all references in duplicate groups; users manually decide which to keep and delete the rest. **This is explicitly not an advanced deduplication tool.** Separately, when importing PICO zip files, automatic deduplication occurs at import time, using existing references instead of importing duplicates.

### GRADEpro GDT import

Supports JSON-LD format import. Imports everything except plain language summaries (due to data structure differences). Diagnostic accuracy test PICOs are not yet supported. All GRADE judgments must be filled in (no blank judgments allowed during import).

---

## 8. Conflict of interest management

### Data model

Per-member data: COI document uploads (multiple files), public summary statement (visible in published guidelines), internal summary statement (admin-only), last edit timestamp.

Per-member-per-intervention data: The system auto-populates an **intervention matrix** from all interventions and comparators across all PICOs in the guideline (deduplicated). Admins assign a conflict level for each panel member × each intervention, with internal comments and a **voting exclusion flag** (boolean).

### Bulk operations and visibility

Admins can bulk-set conflict levels per intervention ("low for all members") or per member ("low for all interventions"). Specific interventions and participants can be hidden from public view. During voting on recommendations, **potential conflicts related to attached PICOs' interventions are displayed to all voters** for transparency.

---

## 9. Decision aids and shared decision making

### Auto-generation architecture

Decision aids are **automatically generated** from all PICOs attached to a recommendation. Data is **locked to the PICO** — always synchronized when PICOs update. The decision aid tab only appears if PICOs are selected AND have outcomes or practical issues.

### Layered display design

**Layer 1**: Overview cards of patient-important outcomes + practical issues. **Layer 2**: Clicking an outcome card reveals pictographs showing absolute risk with each option (intervention vs. comparison). **Layer 3**: Full evidence summary and GRADE assessment details.

Only **absolute effects** are shown (relative effects excluded to prevent framing bias). For continuous outcomes, display requires: units of the continuous scale, lower and upper scale points. Authors can rename outcomes, population, intervention, and comparison to patient-friendly labels.

### Practical issues framework (16 categories)

Developed through grounded theory research (Heen et al., J Clin Epidemiol, 2021): Medication routine, Tests and visits, Procedure and device, Recovery and adaptation, Coordination of care, Adverse effects, Interactions and antidote, Physical well-being, Emotional well-being, Pregnancy and nursing, Costs and access, Food and drinks, Exercise and activities, Social life and relationships, Work and education, Travel and driving.

### Dissemination

Available via: online platform (multi-device), PDF export, widget embedding on external websites (three modes: embedded, pop-up, separate window), API for EHR integration, and deep linking with URL suffix `/da`.

---

## 10. Clinical coding and EHR integration

### Supported code systems

**SNOMED CT** (conditions and findings), **ICD-10** (diagnoses), **ATC** (medications), **RxNorm** (drug nomenclature). The system is extensible — additional terminologies can be added on request. Code lookup uses an **auto-complete/suggestive search** via BioPortal integration (type 2-3 letters to get matches).

### Two coding locations

**PICO Codes**: Attached in the "PICO Codes" tab within each evidence profile. Serve as metadata for improved search, grouping, evidence retrieval, and EHR integration.

**EMR Elements**: Attached in the "EHR and Codes" tab within each recommendation. Define **Target Population** (coded conditions) and **Intervention** (coded actions) with an implementation description field. Enable: patient matching via diagnosis/procedure codes, actionable interventions (drug prescriptions, procedure referrals), and contextual patient-specific information display.

EHR systems consume **both** PICO codes and EMR elements via the API layer, enabling clinical decision support at the point of care.

---

## 11. API and known endpoints

### Authentication

Base URL: `https://api.magicapp.org`. Authentication handled through **Keycloak** (as of v11). API credentials are separate from regular user accounts and must be obtained from MAGIC support. Federated identity supported: Cochrane ID, WHO, Google.

### Confirmed endpoints (from ebmeds/magicapp-client GitHub repository and documentation)

| Endpoint Pattern | Method | Description |
|-----------------|--------|-------------|
| `/auth/login` (via Keycloak) | POST | Authenticate, receive session/token |
| `/guidelines?mine=1` | GET | List user's own guidelines |
| `/guidelines?shortName={name}` | GET | Get latest published guideline by short name |
| `/guidelines/{id}/picos` | GET | Get all PICOs for a guideline |
| `/picos/{picoId}/codes` | GET | Get terminology codes for a PICO |
| `/api/v1/guidelines/{id}/docx` | GET | Export guideline as Word |
| `/api/v1/guidelines/{id}/pdf` | GET | Export guideline as PDF |
| `/api/v1/guidelines/{id}` | GET | Export guideline as JSON |

### Inferred REST endpoints (from data model and feature documentation)

Guidelines, sections, recommendations, PICOs, outcomes, references, decision aids, activity logs, versions, and widgets all likely follow standard Spring REST patterns (`/resource`, `/resource/{id}`, CRUD methods). The full OpenAPI spec exists at the Swagger UI URL but requires browser-based rendering (JavaScript SPA that loads spec dynamically).

### Widget URL patterns

- PICO: `https://app.magicapp.org/widget/pico?picoId={ID}&guidelineShortName={shortName}`
- Recommendation: `https://app.magicapp.org/widget/recommendation?...`
- Configurable: width/height, open/closed state, forced language, pinned vs. latest version

---

## 12. Configuration and project management features

### Guideline settings (10 tabs)

**General**: Owner, main editor name, contact, language (15 options), start date, sponsors, disclaimer, description, internal documents (admin-only file uploads for directives, methods files).

**Guideline Customization** (admin-only): Enable subscriptions, show section text previews, show comments in published versions, track changes default, show section numbers, show GRADE strength description banner, show certainty in recommendation label, EtD framework mode (4 or 7 factors), custom organization colors.

**Permissions**: Member management with role assignment.

**COI Management**: Full conflict-of-interest dashboard (see section 8).

**Publishing & Version History**: Publish button, public access toggle, permalink display, version history with PDFs/JSONs, subscriber management.

**Milestones & Checklists**: Custom milestones (name, target date, responsible person) plus a fixed checklist based on **AGREE II** requirements and **SNAP-IT** process steps. All users view; only admins edit. External references: McMaster comprehensive checklist, RIGHT checklist.

**Voting & Delphi**: Guideline-level polls (open text, multiple choice) and recommendation-level polls (strength/direction voting, EtD factor judgments). COI information displayed during voting.

**Tags**: Custom tags for recommendations enabling filtering.

**Word Export / PDF Export**: Customizable PDF options — PICO display mode (inline/annex), text layout (1/2 columns), cover page upload, custom colors, track changes display, real table of contents.

### Task manager (v12.0)

Assign tasks with responsible person, due dates, status. Color-coded by status. Sortable and filterable.

### Guideline status options

Draft, Draft—for internal use, Published—for internal use, Public consultation, Published (with Public Access enabled).

---

## 13. Multi-language, adaptation, and dissemination

### Language support

**15 languages**: Arabic, Chinese, Dutch, Danish, English, French, German, Japanese, Korean, Norwegian, Portuguese, Russian, Spanish, Finnish (Suomi), Swedish. Language is set per user account AND per guideline. A **force language** feature can override button/label language for readers. Country-specific flag icons are available (e.g., Brazil for Portuguese, Canada/USA/Australia for English).

### Content portability and adaptation

PICO and Recommendation **zip export/import** enables sharing across guidelines and organizations. During import, references are auto-deduplicated. The imported PICO retains the "mother"-PICO ID for provenance tracking. Guidelines can be cloned (prefixed "COPY OF") or imported (prefixed "IMPORT OF"). **Adolopment** (guideline adaptation) features are on the roadmap, developed in WHO partnership for managing guidelines across multiple versions, regions, and languages.

### Export formats summary

| Format | Scope | Notes |
|--------|-------|-------|
| PDF | Full guideline | Customizable cover page, 1/2 columns, PICO display, track changes |
| Word (DOCX) | Full guideline, individual PICOs | Matches PDF design as of v12.0 |
| JSON | Full guideline, individual components | Via UI and API |
| MAGICapp Zip | PICOs, Recommendations | Portable across guidelines with full data + references |
| RevMan .sof | PICO evidence profiles | Bidirectional with RevMan 5 |
| JSON-LD | GRADEpro GDT interop | Evidence profile import/export |
| Embeddable Widgets | Recommendations, PICOs | Auto-updating, configurable, three display modes |

---

## 14. FHIR interoperability and emerging standards

### CPG-on-FHIR (HL7)

The **HL7 FHIR Clinical Practice Guidelines Implementation Guide** (STU2 v2.0.0) at `hl7.org/fhir/uv/cpg/` provides FHIR resource profiles for computable guideline representation: CPGPathway, CPGStrategy, CPGRecommendation, CPGMetric, CPGMeasure (all profiled from PlanDefinition). Uses Clinical Quality Language (CQL) for expression logic. FHIR R4-based.

### EBM-on-FHIR

The **Evidence-Based Medicine on FHIR** IG (`build.fhir.org/ig/HL7/ebm/`, in development v1.0.0-ballot3) defines FHIR resources specifically for evidence representation: ArtifactAssessment, Citation, Evidence, EvidenceReport, EvidenceVariable. Profiles include **CertaintyOfEvidence** (GRADE judgments), **RiskOfBias**, **RecommendationJustification** (EtD), **SummaryOfFindings**, and **OutcomeImportanceRating**. Notably, **example resources in this IG are explicitly derived from MAGICapp data** (e.g., "All_cause_mortality_from_MAGICapp_313876"), confirming a viable interoperability pathway.

### CPG-on-EBM-on-FHIR

Combines both IGs to represent evidence-based CPG recommendations with supporting evidence. FHIR R5-based. Developed by the CODEX+/CELIDA project (Charité Berlin, University of Freiburg). Includes an execution engine for applying recommendations to patient data in OMOP CDM format.

### MAGICapp and FHIR

FHIR API implementation is **on the MAGICapp roadmap**. Linn Brandt (CTO) has extensive HL7 FHIR expertise and is involved in related standards groups. MAGICapp's structured data approach with unique IDs and ontology coding aligns architecturally with FHIR resource models. No formal MAGICapp-to-FHIR export pipeline is publicly documented yet.

---

## 15. Academic literature and research foundations

### Core methodology papers

**Vandvik PO et al. (Chest, 2013)** — The foundational paper describing the MAGIC framework and MAGICapp platform vision: solving cumbersome development, suboptimal presentation, inefficient dissemination, outdated content, and inadequate shared decision-making.

**Kristiansen A et al. (Chest, 2015)** — Development and user testing of the **multilayered presentation format** with 47 physicians from six countries: users successively view deeper information from recommendations → rationale → key information → full evidence.

**Brandt L et al. (BMJ Open, 2017)** — Randomized trial: **72% of participants preferred the multilayered format** vs. 16% for standard; 72% vs. 58% demonstrated correct understanding.

**Heen AF et al. (BMC Med Inform Decis Mak, 2021)** — Proof of concept that encounter decision aids can be generically produced from GRADE evidence summaries (SHARE-IT project).

**Heen AF et al. (J Clin Epidemiol, 2021)** — Grounded theory development of the **practical issues framework** (16 categories) for decision aids.

**Guyatt G et al. (BMJ, 2025)** — Recent "Core GRADE" series introduction.

### Key collaborations

**BMJ Rapid Recommendations**: Target 90 days from practice-changing evidence to publication. International panels of 20-25 members including 2-4 patient partners. Published on BMJ website with links to MAGICapp. **WHO Living Guidelines on COVID-19**: Demonstrated living guideline capability with 14+ versions. **DECIDE project** (EU-funded, 2011-2015): Developed the Evidence to Decision frameworks now integrated into MAGICapp. **SHARE-IT**: Decision aids from structured evidence. **SNAP-IT**: Adaptation framework for trustworthy guidelines.

### Comparative study

**Defined et al. (BMC Medical Informatics, 2017)** compared five guideline development tools: MAGICapp, GRADEpro, Internet Portal, BRIDGE-Wiz, and Håndboka. Identified 8 feature themes. Found MAGICapp and GRADEpro were the most fully-featured, with monitoring progress, reference management, version control, and change tracking having least coverage across tools.

---

## 16. Open-source alternatives landscape

### No direct open-source equivalent exists

After comprehensive searching, **no open-source platform replicates MAGICapp's full lifecycle**: GRADE-based evidence assessment → structured recommendations → EtD framework → living guideline publishing → decision aid generation → EHR integration.

### Closest alternatives

**GRADEpro GDT** (Evidence Prime/McMaster): Commercial (free for academic use). The official GRADE Working Group software for Summary of Findings tables, EtD frameworks, PanelVoice, and collaborative authoring. Web-based. Not open source.

**CQLab** (cqlab.io): Open-source visual editor for clinical logic using CQL and FHIR. Focused on execution logic rather than guideline authoring.

**HAPI FHIR** (Apache 2.0): Open-source Java FHIR server/client. Can serve as infrastructure for FHIR-based guideline resources but is not a guideline authoring tool.

**FEvIR Platform**: Visualization and data entry for EBM-on-FHIR resources. Research tool, not a full authoring platform.

**WHO SMART Guidelines / Digital Adaptation Kits**: Complementary framework (not alternative) translating narrative guidelines to digital systems via 5-layer pathway. Uses FHIR, CQL, and DAKs. WHO itself uses MAGICapp.

---

## 17. Recommended architecture for an open-source replication

Based on this comprehensive extraction, an open-source MAGICapp alternative should implement these core modules:

**Module 1 — Guideline Authoring Engine**: Recursive section hierarchy, rich text editing with track changes (per-text-box, per-user), reference management with PubMed/RIS/RevMan import, auto-numbering citations, drag-and-drop reordering.

**Module 2 — GRADE Evidence Engine**: Structured PICO questions with coded terminologies, outcome types (dichotomous/continuous/narrative/qualitative), GRADE quality assessment with all 8 factors, shadow outcomes for evidence updates, RevMan .rm5 bidirectional integration, GRADEpro JSON-LD import.

**Module 3 — Recommendation & EtD Engine**: Structured recommendations with strength/direction enums, configurable EtD framework (4/7/12 factors), per-factor judgments with multi-intervention support, recommendation status tracking, many-to-many PICO-Recommendation linking.

**Module 4 — Decision Aid Generator**: Auto-generation from PICO data, layered display (overview → pictographs → full evidence), practical issues framework (16 categories), patient-friendly label overrides, absolute-effects-only display policy.

**Module 5 — Publishing & Version Control**: Major/minor versioning with immutable snapshots, draft/published/public state machine, living guideline update mechanisms, embeddable widgets (auto-updating), PDF/Word/JSON export, permalink system.

**Module 6 — Collaboration & Governance**: RBAC (5 roles), activity log (always-on audit trail with per-item granularity), COI management (per-member-per-intervention matrix), voting/Delphi tool, milestones/checklists, task manager, feedback/comment system with status workflow.

**Module 7 — Clinical Integration**: SNOMED CT/ICD-10/ATC/RxNorm coding on PICOs and recommendations, EMR elements with target population + intervention codes, REST API for EHR consumption, FHIR resource export (CPG-on-FHIR + EBM-on-FHIR profiles).

**Recommended modern stack replacement**: React/Vue (replacing Dojo), Java Spring Boot or Node.js/Python (backend), PostgreSQL (replacing MySQL), Keycloak (identity), S3-compatible storage, Kubernetes deployment, OpenAPI 3.0 spec-first API design.

---

## Conclusion: what makes MAGICapp architecturally distinctive

Three design decisions set MAGICapp apart from conventional document-based guideline tools and should be preserved in any replication. First, the **interconnected entity model** — every element (section, recommendation, PICO, outcome, reference) has a unique ID and exists as an independently addressable, linkable, extractable entity rather than being embedded in a document. This is what enables auto-generated decision aids, embeddable widgets, EHR integration, and cross-guideline portability. Second, the **separation of evidence from recommendations** via the three-tab architecture (Recommendations/Evidence/References), with many-to-many linking between PICOs and recommendations, allows evidence to be reused across multiple clinical questions and updated independently. Third, the **living guideline state machine** — where individual recommendations carry status metadata, evidence profiles support shadow outcomes for staged updates, and published versions are immutable snapshots while the draft continues evolving — enables continuous evidence-to-practice cycles without disrupting the published record.

The gap this specification fills is significant: **no open-source platform currently implements the full GRADE-to-bedside pipeline** — from structured evidence assessment through EtD framework through multilayered recommendation publishing through auto-generated decision aids through coded EHR integration. Building one from this specification would address a critical need identified by guideline organizations worldwide.