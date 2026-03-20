# OpenGRADE User Workflows

**Platform:** FHIR-native Clinical Guideline Authoring Platform
**Methodology:** GRADE (Grading of Recommendations Assessment, Development and Evaluation)
**Date:** 2026-03-20
**Version:** 1.0

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Application Structure](#application-structure)
4. [Admin Workflows](#admin-workflows)
5. [Author Workflows](#author-workflows)
6. [Reviewer Workflows](#reviewer-workflows)
7. [Viewer Workflows](#viewer-workflows)
8. [Screen Reference Map](#screen-reference-map)
9. [Common Tasks](#common-tasks)

---

## Platform Overview

OpenGRADE is a collaborative platform designed for healthcare professionals to author, review, and publish clinical practice guidelines using GRADE methodology. The platform emphasizes evidence-based decision-making through structured assessment of recommendations, outcomes, and evidence quality.

### Key Features

- **Role-based access control** with four distinct permission levels
- **Guideline workspace** with 10 specialized tabs for different aspects of guideline development
- **GRADE methodology** integration for evidence assessment
- **Collaborative tools** including comments, polls, and decision tracking
- **Multi-language support** (English, Spanish, French)
- **Version control** with publish, compare, and export capabilities
- **Conflict of interest management** with voting exclusions
- **Activity tracking** for audit and transparency

---

## User Roles & Permissions

OpenGRADE implements a role-based access control (RBAC) system with four primary roles:

| Role | Create | Edit | Delete | Publish | Review | View |
|------|--------|------|--------|---------|--------|------|
| **ADMIN** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **AUTHOR** | ✓ | ✓ | ✓* | ✗ | ✓ | ✓ |
| **REVIEWER** | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| **VIEWER** | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

*Authors can delete content they create; admins control content restoration

### Role Descriptions

- **ADMIN** - Full platform access including guideline creation, member management, role assignment, publishing, and conflict of interest oversight
- **AUTHOR** - Create and edit guideline content including recommendations, evidence, references, and supporting materials
- **REVIEWER** - Review content, provide feedback through comments, and participate in polls and voting
- **VIEWER** - Read-only access to published guidelines and their supporting materials

---

## Application Structure

### Navigation & Layout

The OpenGRADE interface consists of two primary navigation levels:

#### Main Navigation (Sidebar)
- **Dashboard** - Central hub showing statistics and recent activity
- **Guidelines** - List of all guidelines with create/open capabilities
- **References** - Cross-guideline reference management

#### Guideline Workspace
When a guideline is open, a tabbed interface provides access to 10 distinct workspace areas:

1. **Recommendations** - Section tree and recommendation editing
2. **Evidence** - GRADE assessment, EtD framework, and outcomes
3. **References** - Per-guideline reference management with usage tracking
4. **Settings** - Configuration for mode, display, and PDF options
5. **Versions** - Publishing, version history, comparison, and export
6. **Tasks** - Kanban board for project management
7. **Polls** - Voting tools for decisions and judgments
8. **Milestones** - AGREE II and SNAP-IT checklist tracking
9. **COI** - Conflict of interest declarations and voting exclusions
10. **Activity** - Audit log with filtering capabilities

### Authentication & Localization

- **Authentication** - Keycloak OIDC integration for secure login and token management
- **Languages** - English, Spanish, and French with language selector in top navigation bar

---

## Admin Workflows

Administrators have full control over platform and guideline management. The following workflows cover all administrative tasks.

### Workflow 1: Login and Access Dashboard

**Objective:** Authenticate and view administrative overview

**Steps:**
1. Navigate to OpenGRADE login page
2. Enter credentials or select federated identity provider
3. Complete authentication with Keycloak
4. System redirects to Dashboard

**Screens Involved:**
- S01 - Login (Keycloak)
- S02 - Dashboard

**Expected Outcome:** Authenticated session established; dashboard displays a welcome message and three statistics cards (guidelines count, sections count, recommendations count)

---

### Workflow 2: Create Organization (if applicable)

**Objective:** Establish organizational context for guideline development

**Steps:**
1. From Dashboard, navigate to Settings or Organization Management
2. Enter organization name, identifier, and optional logo
3. Configure organization-level settings (default language, EtD mode preferences)
4. Save organization configuration
5. System confirms creation and returns to Dashboard

**Screens Involved:**
- S02 - Dashboard
- S18 - Guideline Settings Form (organization-level variant)

**Expected Outcome:** Organization created and set as current context for new guidelines

---

### Workflow 3: Create New Guideline

**Objective:** Initiate a new clinical practice guideline project

**Steps:**
1. From Guidelines list (S03), click "Create Guideline"
2. Open New Guideline Form (S04)
3. Enter required fields:
   - Guideline title (e.g., "Management of Type 2 Diabetes")
   - Short name/abbreviation (e.g., "T2DM-2026")
   - Scope/topic description
   - Organization assignment
4. Configure initial settings:
   - EtD mode (`FOUR_FACTOR`, `SEVEN_FACTOR`, or `TWELVE_FACTOR`)
   - Default language
   - Public/private visibility
5. Click "Create"
6. System creates guideline and opens Workspace - Recommendations tab (S05)

**Screens Involved:**
- S03 - Guidelines List
- S04 - New Guideline Form
- S05 - Guideline Workspace - Recommendations Tab

**Expected Outcome:** New guideline created; workspace ready for content development

---

### Workflow 4: Invite Members and Assign Roles

**Objective:** Build collaborative team with appropriate permissions

**Steps:**
1. Open guideline workspace
2. Navigate to Settings tab (S16)
3. Select "Permission Management" section (S17)
4. Click "Invite Member"
5. Enter member email address
6. Select role from dropdown:
   - ADMIN
   - AUTHOR
   - REVIEWER
   - VIEWER
7. Optionally assign to specific content areas (sections, recommendations)
8. Click "Send Invitation"
9. System sends invitation email with acceptance link
10. New member accepts invitation and joins guideline with assigned role

**Screens Involved:**
- S16 - Settings Panel
- S17 - Permission Management

**Expected Outcome:** Team member invited; email sent; permissions configured upon acceptance

---

### Workflow 5: Configure Guideline Settings

**Objective:** Set up guideline-specific configuration options

**Steps:**
1. Open guideline workspace
2. Navigate to Settings tab (S16)
3. Select "Guideline Settings" section (S18)
4. Configure options:
   - **EtD Mode** - Select Evidence to Decision framework variant:
     - `FOUR_FACTOR` — 4-Factor (Original GRADE)
     - `SEVEN_FACTOR` — 7-Factor
     - `TWELVE_FACTOR` — 12-Factor (Full EtD)
   - **Display Options**:
     - Show/hide decision aids
     - Show/hide shadow outcomes
     - PICO visibility to external users
   - **PDF Export Options**:
     - Include GRADE tables
     - Include EtD framework
     - Include COI declarations
     - Include activity log
5. Save settings
6. System updates guideline configuration

**Screens Involved:**
- S16 - Settings Panel
- S18 - Guideline Settings Form

**Expected Outcome:** Settings applied; configuration affects all workspace views and exports

---

### Workflow 6: Create and Manage Sections

**Objective:** Establish guideline structure with logical content sections

**Steps:**
1. Open Recommendations tab (S05)
2. View Section Tree in sidebar (S06)
3. Click "Add Section" at desired hierarchy level
4. Enter section title and description (e.g., "Lifestyle Interventions", "Pharmacological Treatment")
5. Optionally set section:
   - Number/identifier
   - Order/sequence
   - Visibility settings
   - Content owner/assignee
6. Click "Create Section"
7. To reorder: Drag-and-drop section in tree
8. To edit: Click section name in tree, update details in Section Detail Panel (S07)
9. To delete: Right-click section, select "Archive" (soft delete)
10. To restore: Navigate to Settings > Recover Panel (S19), select archived section, click "Restore"

**Screens Involved:**
- S05 - Guideline Workspace - Recommendations Tab
- S06 - Section Tree (sidebar)
- S07 - Section Detail Panel
- S16 - Settings Panel
- S19 - Recover Panel

**Expected Outcome:** Guideline structure created with sections organized hierarchically; deleted sections can be recovered

---

### Workflow 7: Create Recommendations Within Sections

**Objective:** Author clinical recommendations with supporting details

**Steps:**
1. In Recommendations tab (S05), select a section from tree (S06)
2. Section detail view displays (S07)
3. Click "Add Recommendation"
4. Recommendation Editor Card opens (S08)
5. Complete recommendation fields:
   - **Title** - Short, action-oriented statement
   - **Description** - Detailed recommendation text
   - **Strength** - Strong or Conditional (dropdown)
   - **Direction** - For/Against/Both/Neither (dropdown)
   - **Rationale** - Evidence and clinical reasoning summary
   - **Practical Information** - Implementation guidance
   - **Remark** - Additional context or considerations
6. Save recommendation
7. System displays recommendation card in section view

**Screens Involved:**
- S05 - Guideline Workspace - Recommendations Tab
- S07 - Section Detail Panel
- S08 - Recommendation Editor Card

**Expected Outcome:** Recommendation created and saved; appears in section with all details accessible

---

### Workflow 8: Edit Recommendation Fields

**Objective:** Update and refine recommendation content

**Steps:**
1. In Recommendations tab (S05), locate target recommendation card
2. Click recommendation to expand editor (S08)
3. Edit desired fields:
   - Title, Description, Strength, Direction, Rationale, Practical Information, Remark
4. Changes auto-save or require explicit save depending on UI implementation
5. Close editor when complete

**Screens Involved:**
- S05 - Guideline Workspace - Recommendations Tab
- S08 - Recommendation Editor Card

**Expected Outcome:** Recommendation updated; changes reflected in workspace and on export

---

### Workflow 9: Create PICO Questions and Link to Recommendations

**Objective:** Define Population, Intervention, Comparison, Outcome (PICO) questions for evidence synthesis

**Steps:**
1. Navigate to Evidence tab (S02, referred to as workspace/evidence)
2. Click "Add PICO Question"
3. PICO Builder Panel opens (S09)
4. Define:
   - **Population** - Patient/participant characteristics (e.g., "Adults with type 2 diabetes")
   - **Intervention** - Treatment or action being evaluated (e.g., "Metformin monotherapy")
   - **Comparison** - Alternative intervention or standard care (e.g., "Placebo or no treatment")
   - **Outcomes** - Clinical endpoints of interest (added separately; see Workflow 10)
5. Link PICO to recommendation(s):
   - Select recommendations from dropdown or search
   - System displays all recommendations that could inform this PICO
   - Check recommendations to link
6. Save PICO question
7. System displays PICO in Evidence tab with linked recommendations highlighted

**Screens Involved:**
- S09 - PICO Builder Panel (accessed from Evidence tab within guideline workspace)

**Expected Outcome:** PICO question created; linked to recommendations; ready for outcome addition

---

### Workflow 10: Add Outcomes to PICOs with Evidence Data

**Objective:** Define clinical outcomes and populate with evidence

**Steps:**
1. In Evidence tab, select a PICO question
2. PICO Builder Panel displays (S09)
3. Click "Add Outcome"
4. Outcome detail section appears
5. Enter outcome information:
   - **Outcome name** (e.g., "HbA1c reduction", "Cardiovascular events")
   - **Importance** - Critical, Important, or Not important (dropdown)
   - **Measurement method** - How outcome was measured
   - **Unit of measurement** - e.g., %, mmol/mol, number of events
6. Add evidence data:
   - **Study count** - Number of studies addressing this outcome
   - **Effect estimate** - Point estimate and 95% confidence interval
   - **Sample size** - Participant count across studies
   - **RoB assessment** - Risk of bias categorization
7. Outcome data can be imported from:
   - RevMan export files
   - Manual entry
   - Copy from previous guidelines
8. Save outcome
9. System displays outcome in PICO with all data accessible for GRADE assessment

**Screens Involved:**
- S09 - PICO Builder Panel
- S10 - GRADE Assessment Panel (for assessment of this outcome)

**Expected Outcome:** Outcome defined with evidence data; ready for GRADE certainty assessment

---

### Workflow 11: Perform GRADE Certainty Assessment

**Objective:** Evaluate the quality and certainty of evidence using GRADE methodology

**Steps:**
1. In Evidence tab, select PICO question
2. Navigate to GRADE Assessment Panel (S10)
3. For each outcome linked to PICO:
   a. Review outcome evidence data
   b. Assess certainty of evidence across five dimensions:
      - **Risk of Bias** - Downgrade if serious concerns
      - **Indirectness** - Downgrade if population, intervention, comparison, or outcomes differ
      - **Inconsistency** - Downgrade if results vary across studies (I² > 50%)
      - **Imprecision** - Downgrade if confidence interval is wide or crosses threshold
      - **Publication Bias** - Downgrade if suspected asymmetry
   c. Start with initial certainty level (based on study design):
      - RCTs start at HIGH
      - Observational studies start at LOW
   d. Apply downgrades (each removes one certainty level: HIGH → MODERATE → LOW → VERY LOW)
   e. Consider upgrading factors if present:
      - Large effect size
      - Dose-response relationship
      - All residual confounding favors intervention
   f. Record final certainty rating
4. Document rationale for each judgment
5. Save GRADE assessment
6. System displays certainty rating for outcome with audit trail

**Screens Involved:**
- S10 - GRADE Assessment Panel

**Expected Outcome:** Certainty of evidence assigned; rating drives recommendation strength assignment

---

### Workflow 12: Complete EtD Framework Assessment

**Objective:** Apply Evidence to Decision (EtD) framework to guide recommendation formulation

**Steps:**
1. In the Recommendations tab, expand the target recommendation card (S08)
2. Click the "EtD" sub-tab within the recommendation card (S11)
3. Select associated PICO(s)
3. Assess EtD framework elements (scope determined by EtD mode setting):
   - **Problem** - Is the problem important?
   - **Desirable effects** - Expected beneficial outcomes
   - **Undesirable effects** - Potential harms or adverse effects
   - **Certainty of evidence** - (populated from GRADE assessment)
   - **Values and preferences** - How patients prioritize outcomes
   - **Balance of effects** - Overall benefit-to-harm ratio
   - **Resource implications** - Cost-effectiveness and feasibility
   - **Equity considerations** - Impact on vulnerable populations
   - **Acceptability** - Provider and patient acceptance likelihood
   - **Feasibility** - Practical implementation barriers
4. For each element, enter judgment (typically 5-point scale: strongly favors intervention to strongly against)
5. Add rationale text for each judgment
6. System integrates EtD judgments with GRADE certainty to suggest recommendation strength
7. Review system recommendation and accept or override
8. Save EtD assessment
9. System displays complete EtD summary with all judgments and rationale

**Screens Involved:**
- S11 - EtD Framework Panel

**Expected Outcome:** EtD assessment complete; informs recommendation strength and direction; provides transparency for decision-making

---

### Workflow 13: Manage References

**Objective:** Create, organize, and link evidence references throughout guideline

**Steps:**
1. Navigate to References tab (S14) within guideline workspace, OR
2. Go to top-level References page (S15) for cross-guideline management
3. **To add reference:**
   - Click "Add Reference"
   - Enter reference metadata:
     - Citation (authors, year, title)
     - Publication type (journal article, book, systematic review, etc.)
     - URL or DOI
     - Keywords/tags
   - Upload full-text if available
   - Save reference
4. **To link reference:**
   - Open recommendation or outcome in editor
   - Click "Link Reference" or "Add Evidence"
   - Search or browse reference list
   - Select reference(s) to link
   - Specify link type (primary evidence, supporting reference, guideline citation, etc.)
   - Save link
5. **To view places-used:**
   - In References tab (S14), each reference displays count and list of linked items
   - Click "See places used" to view all connections
6. **To organize:**
   - Use keyword filters to group related references
   - Create custom collections/folders if applicable
7. References automatically populate PICO evidence sections and appear in exports

**Screens Involved:**
- S14 - References Tab
- S15 - Top-level References Page
- S05-S12 - Various workspace tabs with reference linking capability

**Expected Outcome:** References created, linked to content, and tracked; complete audit trail of evidence sources

---

### Workflow 14: Upload Reference Attachments

**Objective:** Store and access full-text documents and supporting materials

**Steps:**
1. Navigate to References tab (S14)
2. Open reference detail view
3. Click "Upload Attachment" or "Add File"
4. Select PDF, Word document, or image file from local system
5. Confirm file upload
6. System stores attachment and displays in reference detail
7. File is accessible to all team members with appropriate permissions
8. Attachments included in guideline exports (if configured in Settings)

**Screens Involved:**
- S14 - References Tab

**Expected Outcome:** Document stored; accessible to team; appears in exports if configured

---

### Workflow 15: Create and Manage Polls

**Objective:** Gather team input and consensus on key decisions

**Steps:**
1. Navigate to Polls tab (S24)
2. Click "Create Poll"
3. Enter poll details:
   - **Question** - Clear, specific question for voting
   - **Poll type** - Select from:
     - Open text (free-form responses)
     - Multiple choice (predefined options)
     - Strength vote (Strong/Conditional for both direction)
     - EtD judgment (5-point scale for specific EtD element)
4. For multiple choice or EtD judgment polls, define options
5. Set poll parameters:
   - Start date/time
   - End date/time
   - Voting restrictions (open to all roles, specific roles only, etc.)
   - Anonymous/identified voting
   - Allow comments on responses
6. Click "Launch Poll"
7. Poll appears in Polls tab; notifications sent to eligible voters
8. Team members access poll and submit responses
9. After voting closes, results display with:
   - Response count and percentages
   - Summary of free-text responses
   - Average ratings if applicable
10. Admin can extend voting period if needed
11. Poll results inform recommendations and EtD judgments

**Screens Involved:**
- S24 - Polls Panel

**Expected Outcome:** Poll created; team input collected; results inform decision-making

---

### Workflow 16: Create and Manage Milestones

**Objective:** Track progress against established guideline development standards

**Steps:**
1. Navigate to Milestones tab (S25)
2. Click "Add Milestone"
3. Select milestone framework:
   - AGREE II (Appraisal of Guidelines for Research and Evaluation)
   - SNAP-IT (Systematic Narrative Appraisal Protocol - Implementation Toolkit)
4. System displays relevant checklist items for selected framework
5. For each checklist item:
   - **Item name** (e.g., "Clear objective stated", "Systematic search conducted")
   - **Status** - Not started / In progress / Complete
   - **Target date** - When item should be completed
   - **Owner** - Team member responsible
   - **Notes** - Progress comments or blockers
6. As work progresses, update item status
7. System calculates overall guideline completion percentage
8. Milestones tab displays:
   - Progress bar with completion percentage
   - Checklist with status indicators
   - Timeline view if dates assigned
9. Completed milestones trigger notifications
10. Historical milestone completion data tracked in Activity log

**Screens Involved:**
- S25 - Milestones Panel

**Expected Outcome:** Guideline progress tracked; team accountable to quality standards; completion metrics visible

---

### Workflow 17: Manage COI Declarations

**Objective:** Document and manage conflict of interest disclosures

**Steps:**
1. Navigate to COI tab (S26)
2. Click "Declare COI" or "New Declaration"
3. Enter COI information:
   - **Team member** - Person making declaration (auto-populated for self)
   - **Type** - Financial, intellectual property, employment, affiliation, personal, other
   - **Details** - Specific COI description (e.g., "Stock ownership in manufacturer X")
   - **Amount** - Financial value if applicable
   - **Duration** - Dates of conflict relevance
   - **Related items** - Link to recommendations or PICOs affected
4. Classify conflict severity:
   - **Major** - Excludes person from all voting/decisions on related items
   - **Minor** - Must disclose but can participate with transparency
   - **None** - No exclusion or restriction
5. Submit declaration
6. Declarations appear in COI Dashboard (S26) visible to admins
7. If declared conflict affects voting:
   - Team member automatically excluded from polls on related items
   - COI notation appears next to member name in voting records
   - Activity log records all COI-related voting exclusions
8. COI declarations can be included in published guideline if configured

**Screens Involved:**
- S26 - COI Dashboard

**Expected Outcome:** COI documented; voting exclusions enforced; transparency maintained

---

### Workflow 18: Manage Tasks (Kanban)

**Objective:** Track and organize guideline development work using project management tools

**Steps:**
1. Navigate to Tasks tab (S23)
2. View Kanban board with columns:
   - **TODO** - New tasks and planned work
   - **IN PROGRESS** - Active work items
   - **DONE** - Completed tasks
3. **To create task:**
   - Click "Add Task" in desired column
   - Enter task details:
     - Title (e.g., "Complete GRADE assessment for PICO 3")
     - Description (optional context)
     - Assignee(s) - Team member(s) responsible
     - Due date
     - Priority - High / Medium / Low
     - Related items - Link to recommendation, PICO, or section
   - Save task
4. **To update task:**
   - Drag task between columns to update status
   - Click task card to open detail view and update fields
5. **To manage task:**
   - Edit assignees or due date
   - Add comments or discussion
   - Mark as blocking or blocked by other tasks
   - Set parent task for subtask relationships
6. Assigned team members receive notifications
7. Tasks with due dates appear in Dashboard activity
8. Completed tasks remain visible with completion date

**Screens Involved:**
- S23 - Task Board (Kanban)

**Expected Outcome:** Work organized; team accountability clear; progress visible to all members

---

### Workflow 19: Use Track Changes

**Objective:** Document and manage modifications to guideline content

**Steps:**
1. In Recommendations tab or any editing view (S05+)
2. Click "Track Changes" toggle in toolbar (S29) to enable change tracking
3. When Track Changes is ON:
   - All edits are recorded with metadata (editor, timestamp, change type)
   - Changed text displayed with visual indicators (underline for insertions, strikethrough for deletions)
   - Previous versions preserved
4. **To accept/reject changes:**
   - Changes appear in a dedicated panel
   - For each change, select "Accept" or "Reject"
   - System either finalizes or reverts the change
   - Accepted changes become permanent; rejected changes removed
5. **To view change history:**
   - Click "View History" to see all changes for an item
   - Timeline displays all modifications with editor name
   - Compare "Before" and "After" versions side-by-side
6. Track Changes can be:
   - Enabled by default for all authors (admin setting)
   - Toggled per author at will
   - Disabled for final approved versions

**Screens Involved:**
- S05-S12 - Various editing views
- S29 - Track Changes Toolbar
- S27 - Activity Log Panel (for change history review)

**Expected Outcome:** All modifications tracked; version history preserved; change review workflow enabled

---

### Workflow 20: Add Threaded Comments

**Objective:** Enable discussion and feedback on guideline content

**Steps:**
1. In Recommendations tab (S05), click on recommendation to open editor (S08)
2. Click "Comments" sub-tab (S28) or comment icon on section
3. Comments Panel opens (S28)
4. Click "Add Comment" to start new thread
5. Enter comment text with optional:
   - @ mentions of team members (notifies them)
   - Rich formatting (bold, italic, lists, code blocks)
   - File attachments or images
6. Post comment
7. Other team members receive notification of new comment
8. **To reply:**
   - Click "Reply" on existing comment
   - Enter reply text
   - Post reply
9. **To resolve:**
   - Comment author or admin can mark thread as "Resolved"
   - Resolved comments collapsed but visible
10. Comments linked to specific content item (recommendation, outcome, etc.)
11. All comments appear in Activity log (S27) with filters by author, date, status
12. Comments included in exports if configured

**Screens Involved:**
- S05 - Guideline Workspace - Recommendations Tab
- S08 - Recommendation Editor Card
- S28 - Comments Panel
- S27 - Activity Log Panel

**Expected Outcome:** Discussion enabled; feedback captured; conversation history preserved

---

### Workflow 21: Publish Guideline

**Objective:** Officially release guideline version with version control

**Steps:**
1. Navigate to Versions tab (S20)
2. Ensure guideline content complete and reviewed
3. Click "Publish Guideline"
4. Publish Dialog opens (S21)
5. Enter publication details:
   - **Version number** - System suggests next version (e.g., 2.0 from 1.5):
     - **Major version** - Significant content changes or methodology updates
     - **Minor version** - Updates, clarifications, or small additions
   - **Version notes** - Summary of changes from previous version
   - **Effective date** - Date guideline becomes active
   - **Status** - Published, Draft, Withdrawn, Retired
   - **Access level** - Public, Organization, Restricted
6. Review pre-publication checklist:
   - All recommendations reviewed
   - All PICO/evidence questions addressed
   - GRADE assessments completed
   - EtD framework assessments completed
   - All COI declarations reviewed and resolved
   - Milestones met
7. If checklist incomplete, system provides warning; may still proceed
8. Click "Publish"
9. System:
   - Creates permanent version snapshot
   - Freezes published version (no edits)
   - Preserves full audit trail
   - Generates version-specific export
   - Notifies all team members of publication
10. Published version appears in version history (S20) with metadata
11. Previous versions remain accessible for comparison and archival

**Screens Involved:**
- S20 - Version History Panel
- S21 - Publish Dialog

**Expected Outcome:** Guideline version published and version-locked; audit trail created; team notified

---

### Workflow 22: Compare Versions

**Objective:** Review changes between guideline versions

**Steps:**
1. Navigate to Versions tab (S20)
2. Version History Panel displays all published and draft versions
3. Click on two versions to compare (or click "Compare" button)
4. Version Compare Dialog opens (S22)
5. Select comparison parameters:
   - **View type** - Side-by-side or unified diff
   - **Content types** - Show/hide: recommendations, GRADE assessments, EtD, references, etc.
6. System displays:
   - Recommendations added, changed, deleted
   - GRADE assessment changes
   - EtD judgment changes
   - Reference updates
   - Metadata changes (dates, status, etc.)
   - Color-coded differences (green = added, red = removed, yellow = modified)
7. Click on specific change to view detail
8. "Copy to Current" option available for recommendations to incorporate previous version content
9. Export comparison results if needed

**Screens Involved:**
- S20 - Version History Panel
- S22 - Version Compare Dialog

**Expected Outcome:** Changes between versions visible; previous good content recoverable

---

### Workflow 23: Export Guideline

**Objective:** Generate guideline outputs in multiple formats

**Steps:**
1. Navigate to Versions tab (S20) or Settings tab (S16)
2. Click "Export Guideline"
3. PDF Export Dialog opens (S31)
4. Configure export options:
   - **Format** - PDF, DOCX, or JSON
   - **Content selection**:
     - Include sections and recommendations
     - Include decision aids preview
     - Include GRADE summary tables
     - Include EtD framework assessments
     - Include references (with or without full-text)
     - Include COI declarations (admin only)
     - Include activity log (admin only)
   - **Version** - Current draft or specific published version
5. For PDF specifically:
   - **Layout** - Single-column, two-column
   - **Include Table of Contents** - Yes/No
   - **Include Appendices** - GRADE tables, EtD framework, references
   - **Branding** - Logo, header/footer organization name
6. Click "Generate Export"
7. System creates output file (may take 30 seconds to several minutes depending on size)
8. Download dialog appears with file ready
9. File saved to local system
10. Export history tracked in Activity log (S27)

**Screens Involved:**
- S16 - Settings Panel
- S20 - Version History Panel
- S31 - PDF Export Dialog

**Expected Outcome:** Guideline exported in requested format; ready for distribution or printing

---

### Workflow 24: Import RevMan (.rm5) Files

**Objective:** Integrate evidence from Cochrane RevMan systematic reviews

**Steps:**
1. Navigate to Evidence tab
2. Click "Import Evidence" or "Upload RevMan File"
3. RevMan Import Wizard opens (S30)
4. Select .rm5 file from local system
5. System parses RevMan file and displays preview:
   - Review title and metadata
   - Included/excluded studies list
   - PICOs and outcomes identified
   - Meta-analysis results and forest plot data
6. Configure import settings:
   - **Create PICOs** - Automatically create PICO questions from RevMan structure
   - **Import outcomes** - All or selected outcomes
   - **Import evidence data** - Study details, effect estimates, confidence intervals
   - **Create references** - Add included studies as references to guideline
   - **Link to existing** - Map to existing PICO/recommendation if similar
7. Review mapping suggestions (system may suggest related existing PICOs)
8. Click "Import"
9. System creates:
   - PICO questions with imported metadata
   - Outcomes with evidence data populated
   - References for included studies
   - Links to recommendations if applicable
10. Imported content appears in Evidence tab ready for GRADE assessment
11. Import source noted in Activity log (S27)

**Screens Involved:**
- S30 - RevMan Import Wizard

**Expected Outcome:** RevMan evidence imported; PICO and outcome structure created; ready for GRADE assessment

---

### Workflow 25: Import/Adapt Guideline from Export

**Objective:** Reuse or adapt previously published guideline

**Steps:**
1. From Guidelines list (S03), click "Create Guideline"
2. Instead of "Create from scratch", select "Create from template" or "Import existing"
3. New Guideline Form (S04) adapted version opens
4. Select source guideline (from organizational library or upload export file)
5. System displays preview of source content:
   - Sections and recommendations
   - PICO structure
   - References
   - Settings
6. Configure import options:
   - **Copy all content** - Complete replication
   - **Select sections** - Choose which sections to import
   - **Create as draft** - Imported guideline starts as draft for customization
7. Click "Import"
8. System creates new guideline with imported content
9. All content editable; not locked to original
10. Original guideline listed as "Adapted from" in metadata
11. New guideline workspace opens in Recommendations tab for customization

**Screens Involved:**
- S03 - Guidelines List
- S04 - New Guideline Form

**Expected Outcome:** Previous guideline imported as template; ready for customization and re-development

---

### Workflow 26: View Activity Log

**Objective:** Audit guideline changes and track team activity

**Steps:**
1. Navigate to Activity tab (S27)
2. Activity Log Panel displays chronological list of all guideline events:
   - Content created, edited, deleted
   - Comments added
   - References linked
   - GRADE assessments changed
   - Votes cast
   - Versions published
   - COI declarations
   - Permissions changes
3. Each log entry includes:
   - **Timestamp** - When event occurred
   - **Author** - Team member who initiated action
   - **Action** - Specific change made
   - **Item** - What was affected (recommendation, PICO, reference, etc.)
   - **Details** - Before/after values for specific fields
4. **To filter activity:**
   - By date range
   - By author/team member
   - By action type (created, edited, deleted, published, etc.)
   - By content item (specific recommendation, PICO, etc.)
5. Click log entry to expand and see full change details
6. "View version" option shows state of guideline at that point in time
7. Export activity log (CSV, PDF) for external reporting or audit

**Screens Involved:**
- S27 - Activity Log Panel

**Expected Outcome:** Complete audit trail visible; accountability established; version recovery possible

---

### Workflow 27: Restore Deleted Content

**Objective:** Recover accidentally deleted sections or guidelines

**Note:** The Recover Panel supports restoration of **sections** and **guidelines** only. Individual recommendations and other content items cannot be restored via this panel.

**Steps:**
1. Navigate to Settings tab (S16)
2. Click "Recover" section (S19)
3. Recover Panel displays:
   - List of deleted sections and guidelines
   - Deletion date and user who deleted
   - Content type and context (which guideline, etc.)
   - Estimated restore date (system retains deletions for 30 days typically)
4. To restore:
   - Click "Restore" next to item
   - Confirm restoration
   - System re-creates item in original location
   - Restoration logged in Activity log
5. Restored items re-appear in workspace with all previous content and links intact
6. If restoration conflicts with existing content (e.g., section recreated but moved elsewhere), system prompts for placement
7. Permanently delete option available but requires explicit confirmation

**Screens Involved:**
- S16 - Settings Panel
- S19 - Recover Panel

**Expected Outcome:** Deleted content restored; accessible again in workspace

---

### Workflow 28: Switch Language

**Objective:** Change interface and content language

**Steps:**
1. Locate language selector in top navigation bar (S32)
2. Click language dropdown
3. Select desired language:
   - English (en)
   - Español (es)
   - Français (fr)
4. System applies language switch:
   - Interface labels, buttons, menus display in selected language
   - Content translations applied (if translations exist)
   - User preference saved
5. Guideline continues with all workspace tabs available in selected language
6. Changes propagate across all open tabs/sections

**Screens Involved:**
- S32 - Language Selector

**Expected Outcome:** Interface language changed; preference persisted for future sessions

---

### Workflow 29: Logout

**Objective:** End authenticated session securely

**Steps:**
1. Click user profile icon or menu in top navigation
2. Select "Logout"
3. System clears session tokens
4. Redirects to login page
5. Browser cache cleared of sensitive data
6. Session ends

**Expected Outcome:** Session terminated; user returned to login screen

---

### Workflow 30: Use Decision Aid Preview

**Objective:** Review the patient-facing decision aid associated with a recommendation

**Steps:**
1. In the Recommendations tab (S05), locate the target recommendation
2. Click the recommendation to expand the editor card (S08)
3. Click the "Decision Aid" sub-tab within the recommendation card (S13)
4. Decision Aid Preview displays three layers:
   - **Overview** — Summary of the recommendation and clinical context
   - **Benefits & Harms** — Visual summary of expected outcomes including pictographs showing absolute effect estimates
   - **Full Evidence** — Detailed evidence summary drawn from linked PICO/GRADE data
5. Interact with pictographs to explore benefit/harm visualizations
6. Review the generated patient-facing content for accuracy before publishing

**Screens Involved:**
- S05 - Workspace - Recommendations Tab
- S08 - Recommendation Editor Card
- S13 - Decision Aid Preview (sub-tab within recommendation card)

**Expected Outcome:** Decision aid content reviewed; pictographs and evidence layers accurate before guideline publication

---

### Workflow 31: Add Shadow Outcomes

**Objective:** Create shadow outcomes to capture additional clinical endpoints not directly addressed in primary evidence syntheses

**Steps:**
1. Navigate to the Evidence tab within the guideline workspace
2. Select the relevant PICO question
3. Select the target outcome within that PICO
4. Click "Create Shadow" on the outcome
5. Shadow Outcome Panel opens (S12)
6. Review the shadow outcome data (pre-populated from the parent outcome structure)
7. Edit shadow outcome fields as needed to reflect the specific endpoint
8. Choose one of:
   - **Promote** — Convert the shadow outcome to a full outcome in the PICO
   - **Discard** — Remove the shadow outcome without promoting

**Screens Involved:**
- S09 - PICO Builder Panel
- S12 - Shadow Outcome Panel

**Expected Outcome:** Shadow outcome created and either promoted to a full outcome or discarded; additional clinical endpoints captured for completeness

---

### Workflow 32: Embed Decision Aid Widget

**Objective:** Embed a recommendation's decision aid in an external web page using the widget package

**Steps:**
1. Identify the recommendation ID for the decision aid to embed
2. Construct the embed URL using the pattern:
   ```
   GET /embed/decision-aid/:recommendationId
   ```
3. In the external page's HTML, add an `<iframe>` pointing to the embed URL:
   ```html
   <iframe src="/embed/decision-aid/<recommendationId>" width="800" height="600" frameborder="0"></iframe>
   ```
4. Configure the widget as needed (width, height, and any query parameters supported by the widget package at `packages/widget/`)
5. Load the external page in a browser to test the iframe renders correctly
6. Verify the decision aid displays the correct recommendation content, including the Overview, Benefits & Harms, and Full Evidence layers
7. Confirm the widget is responsive and accessible within the embedding page

**Screens Involved:**
- S13 - Decision Aid Preview (rendered inside iframe)

**Note:** The embeddable widget is provided by the `packages/widget/` package. The embed endpoint is `GET /embed/decision-aid/:recommendationId`.

**Expected Outcome:** Decision aid widget successfully embedded in external page; recommendation content displayed correctly inside iframe

---

## Author Workflows

Authors create and edit guideline content but do not have publishing or administrative privileges. The following workflows cover typical author activities.

### Workflow A1: Login and Access Dashboard

**Objective:** Authenticate and access assigned guidelines

**Steps:**
1. Navigate to OpenGRADE login page (S01)
2. Enter credentials or federated identity
3. Complete authentication
4. System redirects to Dashboard (S02)
5. Dashboard displays:
   - Total guidelines count
   - Total sections count
   - Total recommendations count
   - Welcome message

**Screens Involved:**
- S01 - Login (Keycloak)
- S02 - Dashboard

**Expected Outcome:** Authenticated; dashboard shows platform statistics overview

---

### Workflow A2: Navigate to Assigned Guideline

**Objective:** Access guideline workspace

**Steps:**
1. From Dashboard (S02), navigate to Guidelines list (S03) and select a guideline
2. System opens guideline workspace
3. Workspace defaults to Recommendations tab (S05)
4. Author can access all tabs based on role permissions

**Screens Involved:**
- S02 - Dashboard
- S05 - Guideline Workspace - Recommendations Tab

**Expected Outcome:** Guideline workspace open; ready for authoring

---

### Workflow A3-A14: Author Content Tasks

**Note:** Authors perform the following tasks (documented above under Admin workflows):
- A3: Create/edit sections (see Workflow 6)
- A4: Create/edit recommendations (see Workflows 7-8)
- A5: Build PICO questions (see Workflow 9)
- A6: Add/edit outcomes with evidence (see Workflow 10)
- A7: Complete GRADE assessment (see Workflow 11)
- A8: Complete EtD framework (see Workflow 12)
- A9: Manage references (see Workflow 13)
- A10: Use track changes (see Workflow 19)
- A11: Add comments (see Workflow 20)
- A12: Participate in polls (see Workflow 15)
- A13: View and update tasks (see Workflow 18)
- A14: View activity log (see Workflow 26)

**Screens Involved:** S05-S27 (various)

**Expected Outcome:** Content created and refined; collaborative feedback captured

---

### Workflow A15: Export Guideline

**Objective:** Generate guideline output for review or presentation

**Steps:**
1. Navigate to Versions tab (S20) or Settings tab (S16)
2. Click "Export Guideline"
3. Configure export options (see Workflow 23)
4. Note: Authors can view but not export COI declarations or activity log
5. Click "Generate Export"
6. Download output file

**Screens Involved:**
- S16 - Settings Panel
- S20 - Version History Panel
- S31 - PDF Export Dialog

**Expected Outcome:** Guideline export created; ready for external distribution

---

### Workflow A16: View Activity Log

**Objective:** Track changes and contributions

**Steps:**
1. Navigate to Activity tab (S27)
2. View activity log with filters available
3. Authors can see all activity but cannot modify or delete log entries

**Screens Involved:**
- S27 - Activity Log Panel

**Expected Outcome:** Activity visible; contributions tracked

---

## Reviewer Workflows

Reviewers provide feedback and participate in decision-making but cannot create or edit content directly. Their role focuses on assessment and input.

### Workflow R1: Login and Access Dashboard

**Objective:** Authenticate and view assigned guidelines

**Steps:**
1. Navigate to login (S01)
2. Complete authentication
3. Dashboard displays (S02)
4. Shows guidelines assigned to reviewer with recent activity

**Screens Involved:**
- S01 - Login (Keycloak)
- S02 - Dashboard

**Expected Outcome:** Authenticated; guidelines visible

---

### Workflow R2: Navigate to Assigned Guideline

**Objective:** Access guideline for review

**Steps:**
1. From Dashboard (S02), click assigned guideline
2. System opens guideline workspace
3. Reviewer can view but not edit content in most tabs
4. Comments tab (S28) and Polls tab (S24) are editable

**Screens Involved:**
- S02 - Dashboard
- S05+ - Workspace tabs (read-only for most)

**Expected Outcome:** Guideline accessible in review mode

---

### Workflow R3: View Sections and Recommendations

**Objective:** Review guideline content structure and recommendations

**Steps:**
1. Navigate to Recommendations tab (S05)
2. Section Tree (S06) displays guideline structure
3. Click section to view Section Detail Panel (S07)
4. Click recommendation to view Recommendation Editor Card (S08) in read-only mode
5. Review all recommendation fields:
   - Title, description, strength, direction, rationale, practical information, remark
6. Can view but cannot edit these fields as reviewer

**Screens Involved:**
- S05 - Guideline Workspace - Recommendations Tab
- S06 - Section Tree (sidebar)
- S07 - Section Detail Panel
- S08 - Recommendation Editor Card (read-only)

**Expected Outcome:** Content reviewed; decision-making rationale visible

---

### Workflow R4: Add Comments and Reply to Threads

**Objective:** Provide feedback and engage in discussion

**Steps:**
1. While viewing recommendation (S08), click Comments sub-tab (S28)
2. Comments Panel opens
3. Click "Add Comment"
4. Enter comment with optional:
   - @ mentions for notifications
   - Rich formatting
   - File attachments
5. Post comment
6. Authors and other team members notified
7. To reply: Click "Reply" on existing comment thread
8. Enter reply text and post

**Screens Involved:**
- S28 - Comments Panel
- S08 - Recommendation Editor Card (for context)

**Expected Outcome:** Feedback provided; discussion thread created/contributed

---

### Workflow R5: Participate in Polls/Voting

**Objective:** Contribute to team decisions through structured voting

**Steps:**
1. Navigate to Polls tab (S24)
2. Polls Panel displays available polls
3. Open poll to view question and voting options
4. Click voting option appropriate to poll type:
   - **Multiple choice:** Click option
   - **Strength vote:** Select Strong/Conditional for For/Against
   - **EtD judgment:** Select point on scale
   - **Open text:** Type response
5. Optionally add comment on response
6. Click "Submit Vote"
7. Vote recorded; results updated (if visible before close)
8. Can change vote before poll closes (if permitted)

**Screens Involved:**
- S24 - Polls Panel

**Expected Outcome:** Vote cast; input collected for decision-making

---

### Workflow R6: View Evidence and GRADE Assessments

**Objective:** Review evidence base and quality assessments

**Steps:**
1. Navigate to Evidence tab (S02/workspace context)
2. Select PICO question
3. View PICO details in PICO Builder Panel (S09) - read-only
4. Navigate to GRADE Assessment Panel (S10)
5. Review GRADE certainty assessments:
   - Outcome definitions
   - RCT/observational study classification
   - Downgrade/upgrade factors applied
   - Final certainty ratings
   - Rationale for each judgment
6. Review EtD Framework Panel (S11) for decision framework applied to PICO
7. View Shadow Outcome Panel (S12) if applicable
8. Can provide comment feedback on assessments but cannot edit

**Screens Involved:**
- S09 - PICO Builder Panel (read-only)
- S10 - GRADE Assessment Panel (read-only)
- S11 - EtD Framework Panel (read-only)
- S12 - Shadow Outcome Panel (read-only)

**Expected Outcome:** Evidence base reviewed; assessment transparency provided

---

### Workflow R7: View References

**Objective:** Review evidence sources

**Steps:**
1. Navigate to References tab (S14)
2. References Tab displays list with:
   - Citation information
   - Publication type
   - Links to outcomes/recommendations using reference
   - Count of places-used
3. Click reference to view details:
   - Full citation
   - URL/DOI
   - Keywords/tags
   - Linked outcomes and recommendations
   - Full-text if uploaded
4. Download full-text for offline review if available

**Screens Involved:**
- S14 - References Tab

**Expected Outcome:** Evidence sources transparent; full-text accessible

---

### Workflow R8: View Activity Log

**Objective:** Track guideline progress and changes

**Steps:**
1. Navigate to Activity tab (S27)
2. Activity Log Panel displays chronological events
3. Filter by date, author, or action type as needed
4. View changes to content, voting results, and milestone progress
5. Cannot edit activity log but can export for reporting

**Screens Involved:**
- S27 - Activity Log Panel

**Expected Outcome:** Progress visible; transparency of process maintained

---

## Viewer Workflows

Viewers have read-only access to published guidelines and supporting materials. Their role is limited to consumption.

### Workflow V1: Login and Access Dashboard

**Objective:** Authenticate and view available guidelines

**Steps:**
1. Navigate to login (S01)
2. Complete authentication
3. Dashboard displays (S02)
4. Shows guidelines accessible to viewer (typically published versions)

**Screens Involved:**
- S01 - Login (Keycloak)
- S02 - Dashboard

**Expected Outcome:** Authenticated; guidelines visible

---

### Workflow V2: Browse Guidelines

**Objective:** Explore published guidelines

**Steps:**
1. From Dashboard (S02), view "Available Guidelines" section
2. Guidelines displayed with:
   - Title and short description
   - Current version number
   - Publication date
   - Topic/specialty tags
3. Click guideline to open read-only view
4. System opens guideline workspace

**Screens Involved:**
- S02 - Dashboard
- S05+ - Workspace tabs (read-only)

**Expected Outcome:** Guideline accessible in read-only mode

---

### Workflow V3-V5: View Guideline Content

**Objective:** Review guideline sections, recommendations, and supporting materials

**Steps:**
1. In guideline workspace, navigate to:
   - **Recommendations tab (S05)** - View section tree and recommendations (read-only)
   - **Evidence tab** - View GRADE assessments and EtD framework (read-only)
   - **References tab (S14)** - View evidence sources (read-only)
3. All content displayed in read-only format
4. Can view decision aids if enabled in guideline settings
5. Cannot add comments or participate in polls

**Screens Involved:**
- S05 - Guideline Workspace - Recommendations Tab
- S09-S12 - Evidence panels (read-only)
- S14 - References Tab

**Expected Outcome:** Content reviewed; evidence source transparency provided

---

### Workflow V6: View Versions

**Objective:** Access specific guideline versions

**Steps:**
1. Navigate to Versions tab (S20)
2. Version History Panel displays:
   - All published versions with dates
   - Version notes describing changes
   - Effective dates
3. Click version to view that specific version content
4. Can compare versions (see Workflow 22)
5. Can download any version as PDF/DOCX

**Screens Involved:**
- S20 - Version History Panel
- S31 - PDF Export Dialog

**Expected Outcome:** Version history accessible; previous versions retrievable

---

## Screen Reference Map

This section provides a consolidated reference of all screens and their locations in the application.

**Note:** OpenGRADE uses state-based navigation (`useState<AppPath>`) — not URL routing. The app state values are `'dashboard' | 'guidelines' | 'references' | 'workspace'`. There is no react-router; navigating between sections updates React state rather than the browser URL path.

| ID | Screen/View | State/Location | Purpose |
|----|-------------|----------------|---------|
| S01 | Login (Keycloak) | External Keycloak page | Authentication portal |
| S02 | Dashboard | State: dashboard | Welcome message and three statistics cards (guidelines, sections, recommendations counts) |
| S03 | Guidelines List | State: guidelines | Browse & manage guidelines |
| S04 | New Guideline Form | State: guidelines (modal/inline) | Create new guideline |
| S05 | Workspace - Recommendations | State: workspace — Recommendations tab | Edit sections & recommendations |
| S06 | Section Tree (sidebar) | State: workspace (sidebar) | Navigate guideline structure |
| S07 | Section Detail Panel | State: workspace — Recommendations tab (main panel) | View/edit section metadata |
| S08 | Recommendation Editor Card | State: workspace — Recommendations tab (expanded card) | Edit recommendation details |
| S09 | PICO Builder Panel | State: workspace — Evidence tab | Define PICOs & outcomes |
| S10 | GRADE Assessment Panel | State: workspace — Evidence tab | Perform GRADE certainty assessment |
| S11 | EtD Framework Panel | State: workspace — Recommendations tab > expand recommendation card > EtD sub-tab | Apply Evidence to Decision framework |
| S12 | Shadow Outcome Panel | State: workspace — Evidence tab | Manage additional outcomes |
| S13 | Decision Aid Preview | State: workspace — Recommendations tab > expand recommendation card > Decision Aid sub-tab | Preview patient decision aids |
| S14 | References Tab | State: workspace — References tab | Manage per-guideline references |
| S15 | Top-level References | State: references | Cross-guideline reference management |
| S16 | Settings Panel | State: workspace — Settings tab | Configure guideline options |
| S17 | Permission Management | State: workspace — Settings tab (section) | Manage team permissions |
| S18 | Guideline Settings Form | State: workspace — Settings tab (section) | Configure guideline-specific options |
| S19 | Recover Panel | State: workspace — Settings tab (section) | Restore deleted sections and guidelines |
| S20 | Version History Panel | State: workspace — Versions tab | View & manage guideline versions |
| S21 | Publish Dialog | State: workspace — Versions tab (modal) | Publish new version |
| S22 | Version Compare Dialog | State: workspace — Versions tab (modal) | Compare versions side-by-side |
| S23 | Task Board (Kanban) | State: workspace — Tasks tab | Project management tasks |
| S24 | Polls Panel | State: workspace — Polls tab | Create & participate in voting |
| S25 | Milestones Panel | State: workspace — Milestones tab | Track AGREE II/SNAP-IT progress |
| S26 | COI Dashboard | State: workspace — COI tab | Manage conflict of interest declarations |
| S27 | Activity Log Panel | State: workspace — Activity tab | View audit trail & changes |
| S28 | Comments Panel | State: workspace (sub-tab) | Thread-based discussion |
| S29 | Track Changes Toolbar | State: workspace (toolbar) | Enable change tracking & review |
| S30 | RevMan Import Wizard | State: workspace (modal) | Import .rm5 evidence files |
| S31 | PDF Export Dialog | State: workspace — Settings tab (modal) | Generate exports (PDF, DOCX, JSON) |
| S32 | Language Selector | Top navigation bar | Switch interface language |
| S33 | Presence Indicators | State: workspace (header) | Show active team members |

---

## Common Tasks

This section provides quick reference for frequently-performed actions across all roles.

### Create a Recommendation
1. Open Recommendations tab (S05)
2. Select section in tree (S06)
3. Click "Add Recommendation"
4. Fill in fields in Recommendation Editor (S08):
   - Title, Description, Strength, Direction, Rationale, Practical Information, Remark
5. Save

**Screens:** S05, S06, S08
**Typical Users:** ADMIN, AUTHOR

---

### Add Evidence for Recommendation
1. Navigate to Evidence tab
2. Find or create PICO question (S09)
3. Add outcome to PICO with:
   - Outcome name
   - Importance classification
   - Evidence data (studies, effect estimates, sample size)
4. Link outcome to relevant recommendations
5. Save

**Screens:** S09
**Typical Users:** ADMIN, AUTHOR

---

### Assess Evidence Quality (GRADE)
1. Navigate to Evidence tab
2. Open GRADE Assessment Panel (S10)
3. For each outcome:
   - Assess five dimensions (RoB, indirectness, inconsistency, imprecision, publication bias)
   - Apply downgrades as warranted
   - Consider upgrading factors
   - Record final certainty rating
4. Save assessment

**Screens:** S10
**Typical Users:** ADMIN, AUTHOR

---

### Apply Evidence to Decision Framework
1. Navigate to Evidence tab
2. Open EtD Framework Panel (S11)
3. Assess 9-10 framework elements:
   - Problem, desirable effects, undesirable effects, certainty of evidence, values, balance, resources, equity, acceptability, feasibility
4. Record judgment (typically 5-point scale) for each element
5. System integrates with GRADE to suggest recommendation strength
6. Save EtD assessment

**Screens:** S11
**Typical Users:** ADMIN, AUTHOR

---

### Link Reference to Content
1. In Recommendations, Evidence, or References tabs
2. Click "Link Reference" or "Add Evidence"
3. Search for reference
4. Select reference
5. Specify link type (primary evidence, supporting reference, etc.)
6. Save link

**Screens:** S05, S09, S10, S11, S14
**Typical Users:** ADMIN, AUTHOR

---

### Participate in Poll
1. Navigate to Polls tab (S24)
2. Open poll
3. Select voting option (multiple choice, strength vote, EtD judgment, or open text)
4. Submit vote
5. Optionally add comment
6. Vote recorded

**Screens:** S24
**Typical Users:** ADMIN, AUTHOR, REVIEWER

---

### Review Content as Reviewer
1. Navigate to Recommendations tab (S05)
2. Browse sections and recommendations in read-only view
3. Click recommendation to view details
4. Add comment on Comments tab (S28)
5. Navigate to Evidence tab to view GRADE and EtD assessments
6. View references (S14) to understand evidence sources

**Screens:** S05, S06, S07, S08, S09, S10, S11, S14, S28
**Typical Users:** REVIEWER

---

### View Guideline as Viewer
1. From Dashboard (S02), select guideline
2. Browse Recommendations tab (S05) for content structure
3. View Evidence tab for GRADE assessments
4. View References tab (S14) for sources
5. View Versions tab (S20) to access other versions
6. Download PDF export via Settings (S31)

**Screens:** S02, S05, S09, S10, S11, S14, S20, S31
**Typical Users:** VIEWER

---

### Export Guideline
1. Navigate to Settings (S16) or Versions (S20) tab
2. Click "Export Guideline"
3. Configure options:
   - Format (PDF, DOCX, JSON)
   - Content selection (sections, GRADE, EtD, references, etc.)
   - Version (current or published)
   - Branding/layout (PDF only)
4. Click "Generate Export"
5. Download file

**Screens:** S16, S20, S31
**Typical Users:** ADMIN, AUTHOR, VIEWER

---

### Publish Guideline Version
1. Navigate to Versions tab (S20)
2. Click "Publish Guideline"
3. Publish Dialog opens (S21)
4. Enter version number (major or minor)
5. Add version notes describing changes
6. Confirm checklist items (recommendations reviewed, GRADE complete, EtD complete, COI resolved, milestones met)
7. Click "Publish"
8. Version frozen and snapshot created

**Screens:** S20, S21
**Typical Users:** ADMIN

---

### Track Changes
1. In editing view, toggle "Track Changes" in toolbar (S29)
2. All edits automatically tracked with:
   - Visual indicators (underline insertions, strikethrough deletions)
   - Editor name and timestamp
   - Change type
3. Accept or reject changes in dedicated panel
4. Accepted changes finalized; rejected changes reverted

**Screens:** S05-S12, S29
**Typical Users:** ADMIN, AUTHOR

---

### Manage Team Permissions
1. Navigate to Settings tab (S16)
2. Click "Permission Management" section (S17)
3. View current team members with roles
4. Click "Invite Member"
5. Enter email and select role (ADMIN, AUTHOR, REVIEWER, VIEWER)
6. Optionally restrict to specific sections/recommendations
7. Send invitation
8. New member accepts and joins with assigned permissions

**Screens:** S16, S17
**Typical Users:** ADMIN

---

### Restore Deleted Content
1. Navigate to Settings tab (S16)
2. Click "Recover" section (S19)
3. View list of deleted sections and guidelines with deletion dates (note: only sections and guidelines can be restored via this panel)
4. Click "Restore" next to desired item
5. Confirm restoration
6. Content re-appears in original location in workspace

**Screens:** S16, S19
**Typical Users:** ADMIN

---

### Access Audit Trail
1. Navigate to Activity tab (S27)
2. Activity Log Panel displays all events chronologically:
   - Content changes with before/after values
   - Comments and voting
   - Publishing and versions
   - Permission changes
3. Filter by date, author, action type, or content item as needed
4. Click log entry to expand and view full details
5. Export activity as CSV or PDF

**Screens:** S27
**Typical Users:** ADMIN, AUTHOR, REVIEWER

---

## Glossary of Key Concepts

**GRADE (Grading of Recommendations Assessment, Development and Evaluation)**
A systematic methodology for assessing the certainty of evidence and formulating evidence-based recommendations. Five dimensions: Risk of Bias, Indirectness, Inconsistency, Imprecision, Publication Bias.

**EtD Framework (Evidence to Decision)**
A structured framework for translating evidence into recommendations by considering problem importance, desirable and undesirable effects, certainty of evidence, values, balance, resource implications, equity, acceptability, and feasibility.

**PICO (Population, Intervention, Comparison, Outcome)**
A structured question format used to guide systematic evidence review and synthesis.

**Certainty of Evidence**
A rating (HIGH, MODERATE, LOW, VERY LOW) indicating confidence in estimates of effect across studies.

**Recommendation Strength**
A classification of clinical recommendations as either STRONG (most patients should follow) or CONDITIONAL (some patients may make different choices).

**Shadow Outcomes**
Additional outcomes not directly addressed in primary evidence syntheses but relevant to guideline decision-making.

**AGREE II**
Appraisal of Guidelines for Research and Evaluation II - a tool for assessing guideline quality across multiple domains.

**SNAP-IT**
Systematic Narrative Appraisal Protocol - Implementation Toolkit - a framework for assessing implementation considerations in guidelines.

**COI (Conflict of Interest)**
Financial, intellectual, employment, affiliation, personal, or other interests that may bias decision-making.

**Soft Delete/Archive**
Removal of content from view while preserving history and allowing restoration.

**Track Changes**
A feature recording all modifications to content with editor identification and timestamps.

**Decision Aid**
Patient-facing materials summarizing guideline recommendations, evidence, and considerations to inform shared decision-making.

---

## Getting Help

For questions or issues while using OpenGRADE:

- **In-app Help**: Click "?" icon in top navigation for contextual help
- **Documentation**: Visit /help or /docs for comprehensive guides
- **Contact Support**: Email support@opengrade.org or use in-app chat
- **Community Forum**: Discuss with other guideline developers at community.opengrade.org

---

**Document Version:** 1.0
**Last Updated:** 2026-03-20
**Maintained By:** OpenGRADE Documentation Team
