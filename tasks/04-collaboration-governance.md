# Phase 4 — Collaboration & Governance (Weeks 23–28)

> **Dependencies**: Phase 1 (collaboration module foundation) + Phase 2 (PICO/recommendation entities for COI matrix and voting)
> **Goal**: Full panel collaboration features — COI management, voting/Delphi, tasks, milestones, comments, subscriber management.
> **Deliverable**: Complete governance toolkit for guideline panel management.

---

## 4.1 COI Management — Backend (`@app/collaboration` expansion)

### Task 4.1.1 — CoiService (Conflict of Interest Management)
- Implement `getCoiDashboard(guidelineId)`:
  - Return matrix: panel members (rows) × interventions (columns)
  - Interventions auto-populated from all unique interventions + comparators across all PICOs in the guideline (deduplicated)
  - Each cell: conflict level (NONE, LOW, MODERATE, HIGH), internal comment, voting exclusion flag, isPublic flag
  - Include per-member: public summary, internal summary, document count, last updated timestamp
- Implement `updateRecord(coiRecordId, dto)`:
  - Update publicSummary, internalSummary
- Implement `updateConflict(conflictId, dto)`:
  - Update conflictLevel, internalComment, excludeFromVoting, isPublic
  - Emit `coi.updated` event
- Implement `bulkSetConflicts(guidelineId, dto)`:
  - Two modes:
    - Per intervention: set conflict level for ALL members for a specific intervention
    - Per member: set conflict level for ALL interventions for a specific member
  - Create/update CoiInterventionConflict records in batch
- Implement `refreshInterventionMatrix(guidelineId)`:
  - Triggered when PICOs are added/removed/updated
  - Recalculate the set of unique interventions
  - Auto-create CoiInterventionConflict records for new intervention × existing member combinations
  - Preserve existing conflict data for unchanged interventions
  - Listen for `pico.created`, `pico.updated`, `pico.deleted` events
- Implement COI document management:
  - `uploadDocument(coiRecordId, file)` — upload to S3 (coi-documents/ prefix)
  - `getDocuments(coiRecordId)` — list documents
  - `deleteDocument(documentId)` — remove from S3
- **Quality gate**: Matrix auto-refreshes when PICOs change; bulk operations work; existing data preserved
- **Tests**:
  - Unit: Intervention deduplication logic; bulk set creates correct records
  - Integration: Add new PICO → verify new intervention rows appear in matrix with NONE defaults
  - E2E: Full COI workflow — upload document → set conflicts → bulk update → verify matrix

### Task 4.1.2 — CoiFhirProjection (Provenance Resource)
- Implement `toProvenance(coiRecord): Provenance`:
  - `agent` → Practitioner reference (panel member)
  - `entity` → intervention references (from CoiInterventionConflict)
  - Custom extensions for: conflict level, voting exclusion, public/internal summaries
  - `recorded` → last updated timestamp
- **Quality gate**: Valid FHIR R5 Provenance resource
- **Test**: Unit test with sample COI data

---

## 4.2 Voting & Delphi — Backend

### Task 4.2.1 — PollService (Voting Tool)
- Implement `create(guidelineId, dto)`:
  - Create Poll with: title, pollType (OPEN_TEXT, MULTIPLE_CHOICE, STRENGTH_VOTE, ETD_JUDGMENT), options (JSON array for multiple choice)
  - Optional: link to recommendationId (for recommendation-level polls)
  - Set isActive = true
  - Emit `poll.created` event
- Implement `getPoll(pollId)`:
  - Return poll with: all votes (if user has permission), vote count, aggregated results
  - For STRENGTH_VOTE: tally per strength option
  - For ETD_JUDGMENT: tally per judgment value
  - For MULTIPLE_CHOICE: tally per option
  - Include COI information: for each voter, show conflicts related to the recommendation's linked PICOs' interventions
- Implement `vote(pollId, userId, dto)`:
  - Create PollVote: value (JSON — flexible per poll type), comment
  - Unique constraint: one vote per user per poll (update if re-voting)
  - **Business rule**: Check voting exclusion from COI — if user is excluded for any intervention in linked PICOs, display warning (but don't block — transparency, not enforcement)
  - Emit `poll.voted` event
- Implement `closePoll(pollId)`:
  - Set isActive = false
  - Emit `poll.closed` event
- **Quality gate**: Voting respects uniqueness; COI transparency works; results aggregate correctly
- **Tests**:
  - Unit: Vote tallying for each poll type; unique vote constraint
  - Integration: Vote on STRENGTH_VOTE → verify tally updates; COI warning appears for conflicted voter
  - E2E: Create poll → multiple users vote → close → verify aggregated results

---

## 4.3 Task Management — Backend

### Task 4.3.1 — TaskService (Kanban-Style Tasks)
- Implement CRUD for Task:
  - `create(guidelineId, dto, userId)`:
    - Create Task with: title, description, dueDate, assigneeId, status (TODO), entityType (optional link to PICO/RECOMMENDATION/etc.), entityId
    - Emit `task.assigned` event (if assignee set)
  - `findAll(guidelineId, filters)`:
    - Filter by: status (TODO, IN_PROGRESS, DONE), assignee, entityType, dueDate range
    - Sort by: dueDate, status, createdAt
    - Include assignee display name
  - `update(taskId, dto)`:
    - Update title, description, dueDate, assigneeId, status
    - Emit `task.updated` event
    - If status changed, emit `task.status-changed` event
- **Quality gate**: Task CRUD with filtering and assignment
- **Tests**:
  - Unit: Filter logic produces correct Prisma queries
  - Integration: Create task → assign → change status → verify in list
  - E2E: Full task lifecycle

---

## 4.4 Milestones & Checklists — Backend

### Task 4.4.1 — MilestoneService
- Implement CRUD for Milestone:
  - `create(guidelineId, dto)`: Create with title, targetDate, responsiblePerson, ordering
  - `findAll(guidelineId)`: Return ordered list with completion status
  - `update(id, dto)`: Update fields, toggle isCompleted
  - `reorder(guidelineId, orderedIds[])`: Batch reorder
- **Quality gate**: Milestones track progress with dates and responsible persons
- **Tests**: CRUD cycle; reorder test

### Task 4.4.2 — ChecklistService
- Implement checklist management:
  - `initializeChecklist(guidelineId)`:
    - Auto-create ChecklistItem records for standard checklists:
      - **AGREE II** items (23 items across 6 domains + 2 overall assessment items)
      - **SNAP-IT** process steps
    - Set category = AGREE_II or SNAP_IT accordingly
  - `getChecklist(guidelineId)`:
    - Return items grouped by category, ordered
  - `toggleItem(itemId, userId)`:
    - Toggle isChecked; set checkedBy and checkedAt
  - `addCustomItem(guidelineId, dto)`:
    - Add custom checklist item (category = CUSTOM)
- **Quality gate**: Standard checklists initialize correctly; toggle tracks who/when
- **Tests**:
  - Unit: AGREE II checklist has correct number of items
  - Integration: Initialize → toggle items → verify checked state persists

---

## 4.5 Comments & Feedback — Backend

### Task 4.5.1 — CommentService (Threaded Comments)
- Implement `create(recommendationId, dto, userId)`:
  - Create FeedbackComment with: content, parentId (for replies), status = OPEN
  - Emit `comment.created` event
- Implement `getThread(recommendationId)`:
  - Return threaded comment tree (parents with nested replies)
  - Include user display names
  - Include status (OPEN, RESOLVED, REJECTED)
  - Sort by createdAt
- Implement `updateStatus(commentId, status)`:
  - ADMIN only: change comment status (resolve or reject)
  - Emit `comment.resolved` or `comment.rejected` event
- Implement `deleteComment(commentId, userId)`:
  - Own comments: user can delete
  - Others' comments: ADMIN only can delete
- **Quality gate**: Threading works correctly; status workflow enforced; permission checks correct
- **Tests**:
  - Unit: Threading builds correct tree; status transitions valid
  - Integration: Create comment → reply → resolve → verify thread structure
  - E2E: Full comment workflow with different user roles

---

## 4.6 Collaboration Controller Expansion

### Task 4.6.1 — CollaborationController (Phase 4 Endpoints)
- Add all Phase 4 collaboration endpoints:
  - **COI**:
    - `GET /api/v1/guidelines/:id/coi` — COI dashboard data (ADMIN only for internal data; public summary available to all)
    - `PUT /api/v1/coi-records/:id` — update COI record (ADMIN only)
    - `PUT /api/v1/coi-conflicts/:id` — update intervention conflict level (ADMIN only)
    - `POST /api/v1/guidelines/:id/coi/bulk` — bulk-set conflict levels (ADMIN only)
    - `POST /api/v1/coi-records/:id/documents` — upload COI document (ADMIN or self)
    - `DELETE /api/v1/coi-documents/:id` — delete COI document (ADMIN only)
  - **Polls**:
    - `POST /api/v1/guidelines/:id/polls` — create poll (ADMIN only)
    - `GET /api/v1/polls/:id` — get poll + votes
    - `POST /api/v1/polls/:id/vote` — submit vote (all members with guideline access)
    - `PUT /api/v1/polls/:id/close` — close poll (ADMIN only)
  - **Tasks**:
    - `POST /api/v1/guidelines/:id/tasks` — create task (ADMIN, AUTHOR)
    - `PUT /api/v1/tasks/:id` — update task (ADMIN, AUTHOR, or assignee)
    - `GET /api/v1/guidelines/:id/tasks` — list tasks (all members)
  - **Milestones**:
    - `POST /api/v1/guidelines/:id/milestones` — create milestone (ADMIN only)
    - `PUT /api/v1/milestones/:id` — update milestone (ADMIN only)
    - `GET /api/v1/guidelines/:id/milestones` — list milestones (all members)
    - `PUT /api/v1/guidelines/:id/milestones/reorder` — reorder (ADMIN only)
  - **Checklists**:
    - `GET /api/v1/guidelines/:id/checklist` — get checklist (all members)
    - `PUT /api/v1/checklist-items/:id/toggle` — toggle item (ADMIN only)
    - `POST /api/v1/guidelines/:id/checklist` — add custom item (ADMIN only)
  - **Comments**:
    - `GET /api/v1/recommendations/:id/comments` — get comment thread (all members; public if enabled)
    - `POST /api/v1/recommendations/:id/comments` — add comment (all members; public if enabled)
    - `PUT /api/v1/comments/:id` — update status / resolve / reject (ADMIN only)
    - `DELETE /api/v1/comments/:id` — delete (own or ADMIN)
- **Quality gate**: All endpoints with correct role-based access
- **Tests**: E2E tests for each endpoint family

---

## 4.7 Frontend — COI Dashboard

### Task 4.7.1 — COI Dashboard (`CoiDashboard.tsx`)
- Implement member × intervention conflict matrix:
  - **Table layout**: Rows = panel members, Columns = interventions (auto-populated from PICOs)
  - **Cells**: Color-coded conflict level dropdown (None=white, Low=green, Moderate=yellow, High=red)
  - **Per-member panel** (expandable row):
    - Public summary (editable text field)
    - Internal summary (admin-only, editable)
    - Uploaded documents (view/delete)
    - Upload document button
    - Last updated timestamp
  - **Bulk operations toolbar**:
    - "Set all members for [intervention]" → level selector
    - "Set all interventions for [member]" → level selector
  - **Voting exclusion** column: checkbox per member-intervention (excludes from voting on recommendations linked to PICOs with that intervention)
  - **Public visibility** toggle per intervention (hide from published view)
  - **Export**: Download COI matrix as CSV/PDF
- **Quality gate**: Matrix updates in real-time; bulk operations work; interventions auto-populate from PICOs
- **Tests**:
  - Render matrix with sample data → verify color-coded cells
  - Bulk set "LOW for all" on an intervention → verify all cells update
  - Add new PICO → verify new intervention column appears

---

## 4.8 Frontend — Voting & Delphi

### Task 4.8.1 — Poll Builder (`PollBuilder.tsx`)
- Implement poll creation interface (admin only):
  - Poll type selector:
    - Open Text: free-text responses
    - Multiple Choice: configurable options (add/remove/reorder)
    - Strength Vote: pre-set options matching GRADE strength enum
    - EtD Judgment: pre-set options matching EtD factor judgments
  - Title input
  - Recommendation selector (optional — for recommendation-level polls)
  - "Create Poll" button
  - Active polls list with close/view actions
- **Quality gate**: All 4 poll types create correctly; options configurable
- **Test**: Create each poll type → verify poll appears in list

### Task 4.8.2 — Voting Interface (`VotingPanel.tsx`)
- Implement voting UI for each poll type:
  - **Open Text**: Text area + submit
  - **Multiple Choice**: Radio buttons for options + optional comment
  - **Strength Vote**: Visual strength selector (same as recommendation strength picker) + comment
  - **EtD Judgment**: Factor-specific judgment selector + comment
  - COI transparency display: banner showing current user's conflicts for linked interventions (if any)
  - Previous vote display (if already voted — allow update)
  - Results display (after poll closed or based on admin settings):
    - Bar chart for tallied results
    - List of individual responses (anonymizable setting)
    - Summary statistics
- **Quality gate**: Voting submits correctly; COI warnings display; results aggregate
- **Tests**:
  - Vote on each poll type → verify submission
  - User with COI → verify warning banner appears
  - Close poll → verify results display with correct tallies

---

## 4.9 Frontend — Task Management

### Task 4.9.1 — Task Board (`TaskBoard.tsx`)
- Implement Kanban-style task management:
  - Three columns: TODO, IN_PROGRESS, DONE
  - Task cards: title, assignee avatar, due date (color-coded: overdue=red, soon=yellow, future=grey), entity link (if task linked to PICO/recommendation)
  - Drag-and-drop between columns (changes status)
  - "Add Task" button → opens creation form
  - Task detail dialog: title, description, assignee (dropdown of guideline members), due date picker, entity link selector, status
  - Filters: by assignee, by entity type, by due date range
  - Sort: by due date, by created date, by assignee
- **Quality gate**: Kanban drag-drop changes task status; filters work; entity links navigate
- **Tests**:
  - Create task → verify in TODO column
  - Drag to IN_PROGRESS → verify status updated
  - Filter by assignee → verify correct tasks shown

---

## 4.10 Frontend — Milestones & Checklists

### Task 4.10.1 — Milestone Tracker (`MilestoneTracker.tsx`)
- Implement milestone timeline display:
  - Vertical timeline with milestone nodes
  - Each milestone: title, target date, responsible person, completion status (checkbox — admin only)
  - Progress bar: percentage of milestones completed
  - Add milestone form (admin only): title, target date, responsible person
  - Reorder milestones (admin only, drag-and-drop)
  - Color-coding: completed=green, upcoming=blue, overdue=red
  - **AGREE II checklist** section:
    - 23+ items grouped by 6 AGREE II domains
    - Checkbox per item (admin only)
    - Domain completion indicators
  - **SNAP-IT checklist** section:
    - Process step items with checkboxes (admin only)
  - **Custom checklist** section:
    - User-added items with checkboxes
    - Add custom item form
- **Quality gate**: Timeline renders correctly; checklists track progress; admin-only editing enforced
- **Tests**:
  - Render milestones → verify timeline layout
  - Toggle checklist item → verify state change
  - Non-admin user → verify checkboxes are disabled

---

## 4.11 Frontend — Activity Log Enhancement

### Task 4.11.1 — Activity Log Enhancement (`ActivityLog.tsx`)
- Enhance the Phase 1 activity log with:
  - **Un-delete capability**: Show soft-deleted items with "Restore" action button
  - **Per-entity activity views**: Activity filtered by PICO, recommendation, section, outcome (accessible via Options menu on each entity)
  - **Flag for follow-up**: Toggle flag icon on each activity entry
  - **Comment on entry**: Inline comment field on each activity entry
  - **Enhanced filtering**:
    - Filter by entity type (PICO, RECOMMENDATION, SECTION, REFERENCE, etc.)
    - Filter by action type (CREATE, UPDATE, DELETE, PUBLISH, etc.)
    - Filter by user
    - Date range picker
    - Full-text search on entity title and change details
  - **Change detail viewer**: Expandable diff view showing field-level changes (old value → new value)
  - **Real-time badge**: Activity count badge on the Activity Bar tab, updating via presence polling
- **Quality gate**: Restore un-deletes entity; filters combine correctly; diffs display accurately
- **Tests**:
  - Soft-delete entity → verify appears in activity with "Restore" → click restore → verify entity recovered
  - Apply multiple filters → verify correct entries shown
  - Expand change details → verify diff display

---

## Phase 4 Summary

| Category | Count |
|----------|-------|
| Backend tasks | 9 |
| Frontend tasks | 7 |
| Total tasks | 16 |
| API endpoints implemented | ~25 |
| FHIR projections | 2 (Provenance, AuditEvent) |
| Collaboration features | 6 (COI, voting, tasks, milestones, checklists, comments) |
