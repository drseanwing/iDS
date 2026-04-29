/**
 * Comprehensive seed data for OpenGRADE Playwright E2E tests.
 * Covers every entity type used in the application, including
 * all CRUD scenarios and relationship variations.
 */

// ─── Users ───────────────────────────────────────────────────────────────────

export const SEED_USERS = [
  { id: 'user-admin', keycloakId: 'kc-admin', email: 'admin@opengrade.test', displayName: 'Alice Admin' },
  { id: 'user-author', keycloakId: 'kc-author', email: 'author@opengrade.test', displayName: 'Bob Author' },
  { id: 'user-reviewer', keycloakId: 'kc-reviewer', email: 'reviewer@opengrade.test', displayName: 'Carol Reviewer' },
  { id: 'user-viewer', keycloakId: 'kc-viewer', email: 'viewer@opengrade.test', displayName: 'Dave Viewer' },
];

// ─── Guidelines ──────────────────────────────────────────────────────────────

export const SEED_GUIDELINES = [
  {
    id: 'gl-htn',
    title: 'Hypertension Management Guidelines',
    shortName: 'HTN-2025',
    status: 'DRAFT',
    description: 'Evidence-based recommendations for hypertension management in adults.',
    language: 'en',
    etdMode: 'FOUR_FACTOR',
    showSectionNumbers: true,
    showCertaintyInLabel: false,
    showGradeDescription: false,
    showSectionTextPreview: true,
    trackChangesDefault: false,
    enableSubscriptions: false,
    enablePublicComments: false,
    pdfColumnLayout: 1,
    picoDisplayMode: 'INLINE',
    coverPageUrl: '',
    isPublic: false,
    isDeleted: false,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-03-20').toISOString(),
  },
  {
    id: 'gl-dm',
    title: 'Diabetes Care Standards',
    shortName: 'DCS-2025',
    status: 'PUBLISHED',
    description: 'Standards of care for patients with type 2 diabetes.',
    language: 'en',
    etdMode: 'SEVEN_FACTOR',
    showSectionNumbers: true,
    showCertaintyInLabel: true,
    showGradeDescription: true,
    showSectionTextPreview: false,
    trackChangesDefault: true,
    enableSubscriptions: true,
    enablePublicComments: false,
    pdfColumnLayout: 2,
    picoDisplayMode: 'ANNEX',
    coverPageUrl: '',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-06-01').toISOString(),
    updatedAt: new Date('2025-02-10').toISOString(),
  },
  {
    id: 'gl-af',
    title: 'Atrial Fibrillation Prevention',
    shortName: 'AF-2024',
    status: 'DRAFT',
    description: 'Guidance on stroke prevention in atrial fibrillation.',
    language: 'en',
    etdMode: 'TWELVE_FACTOR',
    showSectionNumbers: false,
    showCertaintyInLabel: false,
    showGradeDescription: false,
    showSectionTextPreview: true,
    trackChangesDefault: false,
    enableSubscriptions: false,
    enablePublicComments: true,
    pdfColumnLayout: 1,
    picoDisplayMode: 'INLINE',
    coverPageUrl: '',
    isPublic: false,
    isDeleted: false,
    createdAt: new Date('2024-11-01').toISOString(),
    updatedAt: new Date('2025-04-01').toISOString(),
  },
];

export const PRIMARY_GUIDELINE = SEED_GUIDELINES[0];

// ─── Sections ─────────────────────────────────────────────────────────────────

export const SEED_SECTIONS = [
  {
    id: 'sec-bg',
    title: 'Background',
    ordering: 0,
    parentId: null,
    guidelineId: 'gl-htn',
    excludeFromNumbering: false,
    content: null,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    children: [],
  },
  {
    id: 'sec-recs',
    title: 'Clinical Recommendations',
    ordering: 1,
    parentId: null,
    guidelineId: 'gl-htn',
    excludeFromNumbering: false,
    content: null,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    children: [
      {
        id: 'sec-firstline',
        title: 'First-line Treatment',
        ordering: 0,
        parentId: 'sec-recs',
        guidelineId: 'gl-htn',
        excludeFromNumbering: false,
        content: null,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [],
      },
      {
        id: 'sec-secondline',
        title: 'Second-line Treatment',
        ordering: 1,
        parentId: 'sec-recs',
        guidelineId: 'gl-htn',
        excludeFromNumbering: false,
        content: null,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [],
      },
    ],
  },
  {
    id: 'sec-evidence',
    title: 'Evidence Summary',
    ordering: 2,
    parentId: null,
    guidelineId: 'gl-htn',
    excludeFromNumbering: false,
    content: null,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    children: [],
  },
];

// ─── Recommendations ──────────────────────────────────────────────────────────

export const SEED_RECOMMENDATIONS = [
  {
    id: 'rec-ace',
    title: 'ACE Inhibitors for Hypertension',
    description: null,
    remark: null,
    rationale: null,
    practicalInfo: null,
    strength: 'STRONG_FOR',
    recommendationType: 'GRADE',
    sectionId: 'sec-firstline',
    guidelineId: 'gl-htn',
    ordering: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-arb',
    title: 'ARBs as Alternative Therapy',
    description: null,
    remark: null,
    rationale: null,
    practicalInfo: null,
    strength: 'CONDITIONAL_FOR',
    recommendationType: 'GRADE',
    sectionId: 'sec-firstline',
    guidelineId: 'gl-htn',
    ordering: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec-lifestyle',
    title: 'Lifestyle Modifications',
    description: null,
    remark: null,
    rationale: null,
    practicalInfo: null,
    strength: 'STRONG_FOR',
    recommendationType: 'PRACTICE_STATEMENT',
    sectionId: 'sec-bg',
    guidelineId: 'gl-htn',
    ordering: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── PICOs ────────────────────────────────────────────────────────────────────

export const SEED_PICOS = [
  {
    id: 'pico-001',
    label: 'PICO 1 – ACE vs placebo in hypertension',
    population: 'Adults with stage 1 hypertension',
    intervention: 'ACE inhibitors (e.g., ramipril)',
    comparator: 'Placebo or no treatment',
    guidelineId: 'gl-htn',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    outcomes: [
      {
        id: 'out-001',
        picoId: 'pico-001',
        title: 'All-cause mortality',
        type: 'DICHOTOMOUS',
        importance: 'CRITICAL',
        certainty: 'HIGH',
        state: 'UPDATED',
        ordering: 0,
      },
      {
        id: 'out-002',
        picoId: 'pico-001',
        title: 'Systolic blood pressure reduction (mmHg)',
        type: 'CONTINUOUS',
        importance: 'IMPORTANT',
        certainty: 'MODERATE',
        state: 'UPDATED',
        ordering: 1,
      },
    ],
    codes: [],
  },
];

// ─── References ───────────────────────────────────────────────────────────────

export const SEED_REFERENCES = [
  {
    id: 'ref-ace-meta',
    title: 'ACE Inhibitors Meta-Analysis 2023',
    authors: 'Smith J, Johnson A, Brown K',
    year: 2023,
    journal: 'JAMA',
    studyType: 'SYSTEMATIC_REVIEW',
    doi: '10.1001/jama.2023.001',
    pubmedId: null,
    url: null,
    abstract: 'A comprehensive meta-analysis of ACE inhibitor trials in hypertension.',
    createdAt: new Date().toISOString(),
    guidelineId: 'gl-htn',
    guideline: { id: 'gl-htn', title: 'Hypertension Management Guidelines', shortName: 'HTN-2025' },
    sectionPlacements: [
      { sectionId: 'sec-bg', referenceId: 'ref-ace-meta', section: { id: 'sec-bg', title: 'Background' } },
    ],
    outcomeLinks: [],
    attachments: [],
  },
  {
    id: 'ref-dm-rct',
    title: 'Diabetes Prevention Program RCT',
    authors: 'Jones A, Williams B, Davis C',
    year: 2022,
    journal: 'NEJM',
    studyType: 'PRIMARY_STUDY',
    doi: null,
    pubmedId: '12345678',
    url: 'https://www.nejm.org/doi/full/example',
    abstract: 'A randomized controlled trial of lifestyle intervention in diabetes prevention.',
    createdAt: new Date().toISOString(),
    guidelineId: 'gl-dm',
    guideline: { id: 'gl-dm', title: 'Diabetes Care Standards', shortName: 'DCS-2025' },
    sectionPlacements: [],
    outcomeLinks: [],
    attachments: [],
  },
  {
    id: 'ref-af-cohort',
    title: 'Stroke Risk in AF: A Cohort Study',
    authors: 'Taylor R, White S',
    year: 2021,
    journal: 'Lancet',
    studyType: 'COHORT_STUDY',
    doi: '10.1016/S0140-6736(21)00001-0',
    pubmedId: '98765432',
    url: null,
    abstract: null,
    createdAt: new Date().toISOString(),
    guidelineId: 'gl-af',
    guideline: { id: 'gl-af', title: 'Atrial Fibrillation Prevention', shortName: 'AF-2024' },
    sectionPlacements: [],
    outcomeLinks: [],
    attachments: [],
  },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const SEED_TASKS = [
  {
    id: 'task-001',
    title: 'Review ACE inhibitor evidence',
    description: 'Assess quality of evidence for Recommendation 1',
    status: 'TODO',
    priority: 'HIGH',
    assigneeId: 'user-reviewer',
    assignee: { id: 'user-reviewer', displayName: 'Carol Reviewer' },
    guidelineId: 'gl-htn',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-002',
    title: 'Draft lifestyle section',
    description: 'Write background section for lifestyle modifications',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    assigneeId: 'user-author',
    assignee: { id: 'user-author', displayName: 'Bob Author' },
    guidelineId: 'gl-htn',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-003',
    title: 'Approve final document',
    description: 'Chair to sign off on final guideline version',
    status: 'DONE',
    priority: 'HIGH',
    assigneeId: 'user-admin',
    assignee: { id: 'user-admin', displayName: 'Alice Admin' },
    guidelineId: 'gl-htn',
    dueDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Polls ────────────────────────────────────────────────────────────────────

export const SEED_POLLS = [
  {
    id: 'poll-001',
    title: 'Recommendation strength vote',
    pollType: 'STRENGTH_VOTE' as const,
    status: 'OPEN',
    guidelineId: 'gl-htn',
    createdAt: new Date().toISOString(),
    closedAt: null,
    votes: [
      { id: 'vote-001', userId: 'user-author', value: 'STRONG_FOR', comment: 'Strong evidence supports this' },
      { id: 'vote-002', userId: 'user-reviewer', value: 'CONDITIONAL_FOR', comment: '' },
    ],
  },
  {
    id: 'poll-002',
    title: 'Which outcome is most important?',
    pollType: 'MULTIPLE_CHOICE' as const,
    status: 'OPEN',
    guidelineId: 'gl-htn',
    createdAt: new Date().toISOString(),
    closedAt: null,
    votes: [],
  },
  {
    id: 'poll-003',
    title: 'Team feedback on draft',
    pollType: 'OPEN_TEXT' as const,
    status: 'CLOSED',
    guidelineId: 'gl-htn',
    createdAt: new Date().toISOString(),
    closedAt: new Date().toISOString(),
    votes: [
      { id: 'vote-003', userId: 'user-author', value: 'Looks good overall', comment: '' },
    ],
  },
];

// ─── Milestones ───────────────────────────────────────────────────────────────

export const SEED_MILESTONES = [
  {
    id: 'ms-001',
    title: 'Draft Complete',
    targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    responsiblePerson: 'Alice Admin',
    isCompleted: false,
    completedAt: null,
    guidelineId: 'gl-htn',
    checklist: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ms-002',
    title: 'External Review',
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    responsiblePerson: 'Carol Reviewer',
    isCompleted: false,
    completedAt: null,
    guidelineId: 'gl-htn',
    checklist: [
      { id: 'cl-001', milestoneId: 'ms-002', text: 'Send to external reviewers', isChecked: true },
      { id: 'cl-002', milestoneId: 'ms-002', text: 'Collate feedback', isChecked: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ms-003',
    title: 'Initial Literature Search',
    targetDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    responsiblePerson: 'Bob Author',
    isCompleted: true,
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    guidelineId: 'gl-htn',
    checklist: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── COI Records ──────────────────────────────────────────────────────────────

export const SEED_COI_RECORDS = [
  {
    id: 'coi-001',
    userId: 'user-author',
    user: { id: 'user-author', displayName: 'Bob Author', email: 'author@opengrade.test' },
    guidelineId: 'gl-htn',
    conflictType: 'FINANCIAL',
    disclosureText: 'Received speaker fees from PharmaCo in 2024.',
    isExcludedFromVoting: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'coi-002',
    userId: 'user-reviewer',
    user: { id: 'user-reviewer', displayName: 'Carol Reviewer', email: 'reviewer@opengrade.test' },
    guidelineId: 'gl-htn',
    conflictType: 'NONE',
    disclosureText: 'No conflicts of interest to declare.',
    isExcludedFromVoting: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Comments ─────────────────────────────────────────────────────────────────

export const SEED_COMMENTS = [
  {
    id: 'cmt-001',
    content: 'Should we cite the 2024 Cochrane review here?',
    status: 'OPEN',
    recommendationId: 'rec-ace',
    parentId: null,
    user: { id: 'user-reviewer', displayName: 'Carol Reviewer' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [
      {
        id: 'cmt-002',
        content: 'Yes, I will add it in the next revision.',
        status: 'OPEN',
        recommendationId: 'rec-ace',
        parentId: 'cmt-001',
        user: { id: 'user-author', displayName: 'Bob Author' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: [],
      },
    ],
  },
  {
    id: 'cmt-003',
    content: 'The evidence grade seems too high for this outcome.',
    status: 'RESOLVED',
    recommendationId: 'rec-ace',
    parentId: null,
    user: { id: 'user-admin', displayName: 'Alice Admin' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
  },
];

// ─── Permissions ──────────────────────────────────────────────────────────────

export const SEED_PERMISSIONS = [
  {
    id: 'perm-001',
    guidelineId: 'gl-htn',
    userId: 'user-admin',
    user: { id: 'user-admin', displayName: 'Alice Admin', email: 'admin@opengrade.test' },
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'perm-002',
    guidelineId: 'gl-htn',
    userId: 'user-author',
    user: { id: 'user-author', displayName: 'Bob Author', email: 'author@opengrade.test' },
    role: 'AUTHOR',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'perm-003',
    guidelineId: 'gl-htn',
    userId: 'user-reviewer',
    user: { id: 'user-reviewer', displayName: 'Carol Reviewer', email: 'reviewer@opengrade.test' },
    role: 'REVIEWER',
    createdAt: new Date().toISOString(),
  },
];

// ─── Versions ─────────────────────────────────────────────────────────────────

export const SEED_VERSIONS = [
  {
    id: 'ver-002',
    guidelineId: 'gl-htn',
    versionNumber: '1.1',
    versionType: 'MINOR',
    label: 'Minor update – references added',
    createdBy: { id: 'user-admin', displayName: 'Alice Admin' },
    createdAt: new Date('2025-03-01').toISOString(),
  },
  {
    id: 'ver-001',
    guidelineId: 'gl-htn',
    versionNumber: '1.0',
    versionType: 'MAJOR',
    label: 'Initial published version',
    createdBy: { id: 'user-admin', displayName: 'Alice Admin' },
    createdAt: new Date('2025-01-20').toISOString(),
  },
];

// ─── Activity Log ─────────────────────────────────────────────────────────────

export const SEED_ACTIVITY = [
  {
    id: 'act-001',
    guidelineId: 'gl-htn',
    action: 'CREATED',
    entityType: 'RECOMMENDATION',
    entityId: 'rec-ace',
    description: 'Created recommendation "ACE Inhibitors for Hypertension"',
    user: { id: 'user-author', displayName: 'Bob Author' },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-002',
    guidelineId: 'gl-htn',
    action: 'UPDATED',
    entityType: 'SECTION',
    entityId: 'sec-bg',
    description: 'Updated section "Background"',
    user: { id: 'user-author', displayName: 'Bob Author' },
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-003',
    guidelineId: 'gl-htn',
    action: 'PUBLISHED',
    entityType: 'VERSION',
    entityId: 'ver-001',
    description: 'Published version 1.0',
    user: { id: 'user-admin', displayName: 'Alice Admin' },
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const SEED_STATS = {
  guidelines: SEED_GUIDELINES.length,
  sections: SEED_SECTIONS.length,
  recommendations: SEED_RECOMMENDATIONS.length,
};

// ─── References page (paginated) ──────────────────────────────────────────────

export const SEED_REFERENCES_PAGINATED = {
  data: SEED_REFERENCES,
  total: SEED_REFERENCES.length,
  page: 1,
  limit: 50,
};
