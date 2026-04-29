/**
 * OpenGRADE Playwright test helpers.
 *
 * Provides two mock strategies:
 *  - setupApiMocks()       – lightweight, static mocks (used by legacy tests)
 *  - setupStatefulMocks()  – full stateful CRUD simulation with per-test state
 *
 * Both strategies intercept the Vite preview's network calls to /api/** so tests
 * run against the built frontend without a real backend.
 *
 * Cleanup is implicit: Playwright isolates each test in its own Page context, so
 * all route handlers and in-memory state are discarded when the page closes.
 * Call cleanupMocks(page) in afterEach if you need to explicitly unroute.
 */

import { Page, Route } from '@playwright/test';
import {
  SEED_GUIDELINES,
  SEED_SECTIONS,
  SEED_RECOMMENDATIONS,
  SEED_REFERENCES,
  SEED_PICOS,
  SEED_TASKS,
  SEED_POLLS,
  SEED_MILESTONES,
  SEED_COI_RECORDS,
  SEED_COMMENTS,
  SEED_PERMISSIONS,
  SEED_VERSIONS,
  SEED_ACTIVITY,
  SEED_STATS,
  PRIMARY_GUIDELINE,
} from './seed-data';

// ─── Re-export for backwards-compat ──────────────────────────────────────────

/** Legacy static mock data (kept for compatibility with existing tests). */
export const mockData = {
  guidelines: SEED_GUIDELINES.slice(0, 2),
  guideline: SEED_GUIDELINES[0],
  sections: SEED_SECTIONS,
  recommendations: SEED_RECOMMENDATIONS,
  references: SEED_REFERENCES.slice(0, 1),
  dashboardStats: SEED_STATS,
};

// ─── Stateful mock state factory ─────────────────────────────────────────────

/** Deep-clones seed arrays so each test starts with an isolated copy. */
export function createMockState() {
  return {
    guidelines: structuredClone(SEED_GUIDELINES) as typeof SEED_GUIDELINES,
    sections: structuredClone(SEED_SECTIONS) as typeof SEED_SECTIONS,
    recommendations: structuredClone(SEED_RECOMMENDATIONS) as typeof SEED_RECOMMENDATIONS,
    references: structuredClone(SEED_REFERENCES) as typeof SEED_REFERENCES,
    picos: structuredClone(SEED_PICOS) as typeof SEED_PICOS,
    tasks: structuredClone(SEED_TASKS) as typeof SEED_TASKS,
    polls: structuredClone(SEED_POLLS) as typeof SEED_POLLS,
    milestones: structuredClone(SEED_MILESTONES) as typeof SEED_MILESTONES,
    coiRecords: structuredClone(SEED_COI_RECORDS) as typeof SEED_COI_RECORDS,
    comments: structuredClone(SEED_COMMENTS) as typeof SEED_COMMENTS,
    permissions: structuredClone(SEED_PERMISSIONS) as typeof SEED_PERMISSIONS,
    versions: structuredClone(SEED_VERSIONS) as typeof SEED_VERSIONS,
    activity: structuredClone(SEED_ACTIVITY) as typeof SEED_ACTIVITY,
  };
}

export type MockState = ReturnType<typeof createMockState>;

// ─── Helper utilities ────────────────────────────────────────────────────────

function ok(body: unknown): Parameters<Route['fulfill']>[0] {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(body) };
}

function created(body: unknown): Parameters<Route['fulfill']>[0] {
  return { status: 201, contentType: 'application/json', body: JSON.stringify(body) };
}

function noContent(): Parameters<Route['fulfill']>[0] {
  return { status: 204 };
}

function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseBody(route: Route): Record<string, unknown> {
  try {
    return JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function flatSections(sections: MockState['sections']): MockState['sections'][number][] {
  const result: MockState['sections'][number][] = [];
  for (const s of sections) {
    result.push(s);
    if (s.children?.length) result.push(...flatSections(s.children as MockState['sections']));
  }
  return result;
}

// ─── Stateful mock handler ────────────────────────────────────────────────────

/**
 * Installs a stateful API mock that simulates full CRUD on all OpenGRADE
 * entities. Each call to setupStatefulMocks() creates a fresh, isolated state.
 */
export async function setupStatefulMocks(page: Page, overrides?: Partial<MockState>) {
  const state: MockState = { ...createMockState(), ...overrides };

  await page.route('**/api/**', async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const apiPath = url.pathname.replace(/^\/api/, '');

    // ── Health ─────────────────────────────────────────────────────────────
    if (apiPath === '/health' || apiPath === '/auth/status') {
      return route.fulfill(ok({ status: 'ok' }));
    }

    // ── Dashboard stats ────────────────────────────────────────────────────
    if (apiPath === '/guidelines/stats' && method === 'GET') {
      return route.fulfill(ok({
        guidelines: state.guidelines.length,
        sections: flatSections(state.sections).length,
        recommendations: state.recommendations.length,
      }));
    }

    // ── Guidelines ─────────────────────────────────────────────────────────
    if (apiPath === '/guidelines' && method === 'GET') {
      return route.fulfill(ok(state.guidelines.filter((g) => !g.isDeleted)));
    }
    if (apiPath === '/guidelines' && method === 'POST') {
      const body = parseBody(route);
      const g = {
        ...PRIMARY_GUIDELINE,
        id: uid('gl'),
        title: String(body.title ?? 'Untitled'),
        shortName: String(body.shortName ?? ''),
        status: 'DRAFT',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.guidelines.push(g as typeof SEED_GUIDELINES[number]);
      return route.fulfill(created(g));
    }

    // Single guideline: /guidelines/:id and /guidelines/:id/sub-resources
    const glSubMatch = apiPath.match(/^\/guidelines\/([^/]+)\/(.+)$/);
    if (glSubMatch) {
      const [, id, sub] = glSubMatch;
      if (sub === 'permissions') {
        if (method === 'GET') return route.fulfill(ok(state.permissions.filter((p) => p.guidelineId === id)));
        if (method === 'POST') {
          const body = parseBody(route);
          const perm = { id: uid('perm'), guidelineId: id, userId: String(body.userId ?? ''), user: { id: String(body.userId ?? ''), displayName: String(body.userId ?? ''), email: '' }, role: String(body.role ?? 'VIEWER'), createdAt: new Date().toISOString() };
          state.permissions.push(perm as typeof SEED_PERMISSIONS[number]);
          return route.fulfill(created(perm));
        }
      }
      if (sub.startsWith('permissions/')) {
        const userId = sub.replace('permissions/', '');
        state.permissions = state.permissions.filter((p) => !(p.guidelineId === id && p.userId === userId));
        return route.fulfill(noContent());
      }
      if (sub === 'export' || sub === 'export/json') return route.fulfill(ok({ guideline: id }));
      if (sub === 'export/docx') return route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: '' });
      if (sub === 'export/pdf') return route.fulfill({ status: 200, contentType: 'application/pdf', body: '' });
      if (sub === 'validate') return route.fulfill(ok({ valid: true, errors: [] }));
      if (sub === 'clone') return route.fulfill(created({ ...state.guidelines.find((g) => g.id === id), id: uid('gl') }));
      if (sub === 'restore') {
        const g = state.guidelines.find((g) => g.id === id);
        if (g) (g as Record<string, unknown>).isDeleted = false;
        return route.fulfill(ok(g));
      }
      if (sub === 'status') {
        const body = parseBody(route);
        const g = state.guidelines.find((g) => g.id === id);
        if (g) (g as Record<string, unknown>).status = body.status;
        return route.fulfill(ok(g));
      }
      if (sub === 'public') {
        const body = parseBody(route);
        const g = state.guidelines.find((g) => g.id === id);
        if (g) (g as Record<string, unknown>).isPublic = body.isPublic;
        return route.fulfill(ok(g));
      }
      return route.fulfill(ok({}));
    }

    const glMatch = apiPath.match(/^\/guidelines\/([^/]+)$/);
    if (glMatch) {
      const id = glMatch[1];
      const g = state.guidelines.find((g) => g.id === id) ?? state.guidelines[0];
      if (method === 'GET') return route.fulfill(ok(g));
      if (method === 'PUT' || method === 'PATCH') {
        const body = parseBody(route);
        Object.assign(g, body, { updatedAt: new Date().toISOString() });
        return route.fulfill(ok(g));
      }
      if (method === 'DELETE') {
        (g as Record<string, unknown>).isDeleted = true;
        return route.fulfill(noContent());
      }
    }

    // ── Sections ───────────────────────────────────────────────────────────
    if (apiPath === '/sections' && method === 'GET') {
      const glId = url.searchParams.get('guidelineId');
      const filtered = state.sections.filter((s) => !glId || s.guidelineId === glId);
      return route.fulfill(ok(filtered));
    }
    if (apiPath === '/sections' && method === 'POST') {
      const body = parseBody(route);
      const sec = {
        id: uid('sec'),
        title: String(body.title ?? 'New Section'),
        ordering: Number(body.ordering ?? 99),
        parentId: body.parentId ?? null,
        guidelineId: String(body.guidelineId ?? 'gl-htn'),
        excludeFromNumbering: false,
        content: null,
        isDeleted: false,
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.sections.push(sec as typeof SEED_SECTIONS[number]);
      return route.fulfill(created(sec));
    }
    if (apiPath === '/sections/reorder' && method === 'POST') {
      return route.fulfill(ok({ reordered: true }));
    }
    const secMatch = apiPath.match(/^\/sections\/([^/]+)$/);
    if (secMatch) {
      const id = secMatch[1];
      if (method === 'PUT' || method === 'PATCH') {
        const allSecs = flatSections(state.sections);
        const sec = allSecs.find((s) => s.id === id);
        if (sec) Object.assign(sec, parseBody(route), { updatedAt: new Date().toISOString() });
        return route.fulfill(ok(sec ?? {}));
      }
      if (method === 'DELETE') {
        state.sections = state.sections.filter((s) => s.id !== id);
        return route.fulfill(noContent());
      }
    }

    // ── Recommendations ────────────────────────────────────────────────────
    if (apiPath === '/recommendations' && method === 'GET') {
      const glId = url.searchParams.get('guidelineId');
      const secId = url.searchParams.get('sectionId');
      let recs = state.recommendations;
      if (glId) recs = recs.filter((r) => r.guidelineId === glId);
      if (secId) recs = recs.filter((r) => r.sectionId === secId);
      return route.fulfill(ok(recs));
    }
    if (apiPath === '/recommendations' && method === 'POST') {
      const body = parseBody(route);
      const rec = {
        id: uid('rec'),
        title: String(body.title ?? 'New Recommendation'),
        description: null, remark: null, rationale: null, practicalInfo: null,
        strength: body.strength ?? null,
        recommendationType: body.recommendationType ?? 'GRADE',
        sectionId: String(body.sectionId ?? ''),
        guidelineId: String(body.guidelineId ?? 'gl-htn'),
        ordering: 99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.recommendations.push(rec as typeof SEED_RECOMMENDATIONS[number]);
      return route.fulfill(created(rec));
    }
    const recMatch = apiPath.match(/^\/recommendations\/([^/]+)$/);
    if (recMatch) {
      const id = recMatch[1];
      const rec = state.recommendations.find((r) => r.id === id);
      if (method === 'GET') return route.fulfill(ok(rec ?? {}));
      if (method === 'PUT' || method === 'PATCH') {
        if (rec) Object.assign(rec, parseBody(route), { updatedAt: new Date().toISOString() });
        return route.fulfill(ok(rec ?? {}));
      }
      if (method === 'DELETE') {
        state.recommendations = state.recommendations.filter((r) => r.id !== id);
        return route.fulfill(noContent());
      }
    }

    // ── PICOs ──────────────────────────────────────────────────────────────
    if (apiPath === '/picos' && method === 'GET') return route.fulfill(ok(state.picos));
    if (apiPath === '/picos' && method === 'POST') {
      const body = parseBody(route);
      const p = { id: uid('pico'), ...body, outcomes: [], codes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      state.picos.push(p as typeof SEED_PICOS[number]);
      return route.fulfill(created(p));
    }
    const picoMatch = apiPath.match(/^\/picos\/([^/]+)$/);
    if (picoMatch) {
      const id = picoMatch[1];
      const pico = state.picos.find((p) => p.id === id);
      if (method === 'GET') return route.fulfill(ok(pico ?? {}));
      if (method === 'PUT' || method === 'PATCH') { if (pico) Object.assign(pico, parseBody(route)); return route.fulfill(ok(pico ?? {})); }
      if (method === 'DELETE') { state.picos = state.picos.filter((p) => p.id !== id); return route.fulfill(noContent()); }
    }

    // ── Outcomes ───────────────────────────────────────────────────────────
    if (apiPath === '/outcomes' && method === 'POST') {
      const body = parseBody(route);
      const out = { id: uid('out'), ...body, createdAt: new Date().toISOString() };
      const pico = state.picos.find((p) => p.id === body.picoId);
      if (pico) pico.outcomes.push(out as typeof SEED_PICOS[number]['outcomes'][number]);
      return route.fulfill(created(out));
    }
    const outMatch = apiPath.match(/^\/outcomes\/([^/]+)$/);
    if (outMatch) {
      if (method === 'PUT' || method === 'PATCH') return route.fulfill(ok({ id: outMatch[1], ...parseBody(route) }));
      if (method === 'DELETE') {
        for (const p of state.picos) p.outcomes = p.outcomes.filter((o) => o.id !== outMatch[1]);
        return route.fulfill(noContent());
      }
    }

    // ── References ─────────────────────────────────────────────────────────
    if (apiPath === '/references' && method === 'GET') {
      const q = url.searchParams.get('q')?.toLowerCase() ?? '';
      const glId = url.searchParams.get('guidelineId');
      let refs = state.references;
      if (glId) refs = refs.filter((r) => r.guidelineId === glId);
      if (q) refs = refs.filter((r) => r.title.toLowerCase().includes(q) || r.authors.toLowerCase().includes(q));
      const page = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 50);
      return route.fulfill(ok({ data: refs.slice((page - 1) * limit, page * limit), total: refs.length, page, limit }));
    }
    if (apiPath === '/references' && method === 'POST') {
      const body = parseBody(route);
      const ref = { id: uid('ref'), sectionPlacements: [], outcomeLinks: [], attachments: [], guideline: null, createdAt: new Date().toISOString(), ...body };
      state.references.push(ref as typeof SEED_REFERENCES[number]);
      return route.fulfill(created(ref));
    }
    const refSubMatch = apiPath.match(/^\/references\/([^/]+)\/attachments(?:\/([^/]+))?$/);
    if (refSubMatch) {
      if (method === 'POST') return route.fulfill(created({ id: uid('att'), filename: 'file.pdf', fileUrl: '/files/file.pdf', mimeType: 'application/pdf' }));
      if (method === 'DELETE') return route.fulfill(noContent());
    }
    const refMatch = apiPath.match(/^\/references\/([^/]+)$/);
    if (refMatch) {
      const id = refMatch[1];
      const ref = state.references.find((r) => r.id === id);
      if (method === 'GET') return route.fulfill(ok(ref ?? {}));
      if (method === 'PUT' || method === 'PATCH') { if (ref) Object.assign(ref, parseBody(route)); return route.fulfill(ok(ref ?? {})); }
      if (method === 'DELETE') { state.references = state.references.filter((r) => r.id !== id); return route.fulfill(noContent()); }
    }

    // ── Links (section↔reference) ──────────────────────────────────────────
    if (apiPath === '/links' || apiPath.startsWith('/links/')) {
      if (method === 'GET') return route.fulfill(ok([]));
      return route.fulfill(created({ id: uid('lnk') }));
    }

    // ── Tasks ──────────────────────────────────────────────────────────────
    if (apiPath === '/tasks' && method === 'GET') return route.fulfill(ok(state.tasks));
    if (apiPath === '/tasks' && method === 'POST') {
      const body = parseBody(route);
      const task = { id: uid('task'), assignee: null, dueDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...body };
      state.tasks.push(task as typeof SEED_TASKS[number]);
      return route.fulfill(created(task));
    }
    const taskMatch = apiPath.match(/^\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const id = taskMatch[1];
      const task = state.tasks.find((t) => t.id === id);
      if (method === 'GET') return route.fulfill(ok(task ?? {}));
      if (method === 'PUT' || method === 'PATCH') { if (task) Object.assign(task, parseBody(route), { updatedAt: new Date().toISOString() }); return route.fulfill(ok(task ?? {})); }
      if (method === 'DELETE') { state.tasks = state.tasks.filter((t) => t.id !== id); return route.fulfill(noContent()); }
    }

    // ── Polls ──────────────────────────────────────────────────────────────
    if (apiPath === '/polls' && method === 'GET') return route.fulfill(ok(state.polls));
    if (apiPath === '/polls' && method === 'POST') {
      const body = parseBody(route);
      const poll = { id: uid('poll'), status: 'OPEN', closedAt: null, votes: [], createdAt: new Date().toISOString(), ...body };
      state.polls.push(poll as typeof SEED_POLLS[number]);
      return route.fulfill(created(poll));
    }
    const pollSubMatch = apiPath.match(/^\/polls\/([^/]+)\/(vote|close)$/);
    if (pollSubMatch) {
      const [, id, action] = pollSubMatch;
      const poll = state.polls.find((p) => p.id === id);
      if (action === 'vote' && method === 'POST') {
        const body = parseBody(route);
        if (poll) poll.votes.push({ id: uid('vote'), userId: 'user-current', ...body } as typeof SEED_POLLS[number]['votes'][number]);
        return route.fulfill(ok(poll ?? {}));
      }
      if (action === 'close' && method === 'POST') {
        if (poll) { (poll as Record<string, unknown>).status = 'CLOSED'; (poll as Record<string, unknown>).closedAt = new Date().toISOString(); }
        return route.fulfill(ok(poll ?? {}));
      }
    }
    const pollMatch = apiPath.match(/^\/polls\/([^/]+)$/);
    if (pollMatch) {
      const id = pollMatch[1];
      if (method === 'DELETE') { state.polls = state.polls.filter((p) => p.id !== id); return route.fulfill(noContent()); }
    }

    // ── Milestones ─────────────────────────────────────────────────────────
    if (apiPath === '/milestones' && method === 'GET') return route.fulfill(ok(state.milestones));
    if (apiPath === '/milestones' && method === 'POST') {
      const body = parseBody(route);
      const ms = { id: uid('ms'), isCompleted: false, completedAt: null, checklist: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...body };
      state.milestones.push(ms as typeof SEED_MILESTONES[number]);
      return route.fulfill(created(ms));
    }
    const msSubMatch = apiPath.match(/^\/milestones\/([^/]+)\/(complete|checklist(?:\/([^/]+))?)$/);
    if (msSubMatch) {
      const [, id, sub] = msSubMatch;
      const ms = state.milestones.find((m) => m.id === id);
      if (sub === 'complete' && method === 'POST') {
        if (ms) { (ms as Record<string, unknown>).isCompleted = true; (ms as Record<string, unknown>).completedAt = new Date().toISOString(); }
        return route.fulfill(ok(ms ?? {}));
      }
      return route.fulfill(ok(ms ?? {}));
    }
    const msMatch = apiPath.match(/^\/milestones\/([^/]+)$/);
    if (msMatch) {
      const id = msMatch[1];
      const ms = state.milestones.find((m) => m.id === id);
      if (method === 'PUT' || method === 'PATCH') { if (ms) Object.assign(ms, parseBody(route), { updatedAt: new Date().toISOString() }); return route.fulfill(ok(ms ?? {})); }
      if (method === 'DELETE') { state.milestones = state.milestones.filter((m) => m.id !== id); return route.fulfill(noContent()); }
    }

    // ── COI ────────────────────────────────────────────────────────────────
    if (apiPath === '/coi' && method === 'GET') return route.fulfill(ok(state.coiRecords));
    if (apiPath === '/coi' && method === 'POST') {
      const body = parseBody(route);
      const coi = { id: uid('coi'), user: { id: String(body.userId ?? ''), displayName: String(body.userId ?? ''), email: '' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...body };
      state.coiRecords.push(coi as typeof SEED_COI_RECORDS[number]);
      return route.fulfill(created(coi));
    }
    const coiMatch = apiPath.match(/^\/coi\/([^/]+)$/);
    if (coiMatch) {
      const id = coiMatch[1];
      const coi = state.coiRecords.find((c) => c.id === id);
      if (method === 'PUT' || method === 'PATCH') { if (coi) Object.assign(coi, parseBody(route), { updatedAt: new Date().toISOString() }); return route.fulfill(ok(coi ?? {})); }
      if (method === 'DELETE') { state.coiRecords = state.coiRecords.filter((c) => c.id !== id); return route.fulfill(noContent()); }
    }

    // ── Comments ───────────────────────────────────────────────────────────
    if (apiPath === '/comments' && method === 'GET') return route.fulfill(ok(state.comments));
    if (apiPath === '/comments' && method === 'POST') {
      const body = parseBody(route);
      const cmt = { id: uid('cmt'), status: 'OPEN', replies: [], user: { id: 'user-current', displayName: 'Current User' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...body };
      state.comments.push(cmt as typeof SEED_COMMENTS[number]);
      return route.fulfill(created(cmt));
    }
    const cmtSubMatch = apiPath.match(/^\/comments\/([^/]+)\/(status|resolve)$/);
    if (cmtSubMatch) {
      const [, id] = cmtSubMatch;
      const cmt = state.comments.find((c) => c.id === id);
      if (cmt && method === 'PATCH') {
        const body = parseBody(route);
        (cmt as Record<string, unknown>).status = body.status ?? 'RESOLVED';
      }
      return route.fulfill(ok(cmt ?? {}));
    }
    const cmtMatch = apiPath.match(/^\/comments\/([^/]+)$/);
    if (cmtMatch) {
      const id = cmtMatch[1];
      if (method === 'DELETE') { state.comments = state.comments.filter((c) => c.id !== id); return route.fulfill(noContent()); }
    }

    // ── Versions ───────────────────────────────────────────────────────────
    if (apiPath === '/versions' && method === 'GET') return route.fulfill(ok({ versions: state.versions }));
    if (apiPath === '/versions' && method === 'POST') {
      const body = parseBody(route);
      const ver = { id: uid('ver'), versionType: body.versionType ?? 'MINOR', versionNumber: `1.${state.versions.length}`, label: body.label ?? '', createdBy: { id: 'user-current', displayName: 'Current User' }, guidelineId: body.guidelineId ?? 'gl-htn', createdAt: new Date().toISOString() };
      state.versions.unshift(ver as typeof SEED_VERSIONS[number]);
      return route.fulfill(created(ver));
    }

    // ── Activity ───────────────────────────────────────────────────────────
    if (apiPath === '/activity' || apiPath.startsWith('/activity')) {
      return route.fulfill(ok({ data: state.activity, meta: { total: state.activity.length, page: 1, limit: 20, totalPages: 1 } }));
    }

    // ── EtD factors ────────────────────────────────────────────────────────
    if (apiPath.startsWith('/etd') || apiPath.startsWith('/etd-factors')) {
      if (method === 'GET') return route.fulfill(ok([]));
      return route.fulfill(ok({ id: uid('etd') }));
    }

    // ── Presence ───────────────────────────────────────────────────────────
    if (apiPath.startsWith('/presence')) return route.fulfill(ok([]));

    // ── FHIR ───────────────────────────────────────────────────────────────
    if (apiPath.startsWith('/fhir')) return route.fulfill(ok({}));

    // ── Terminology ────────────────────────────────────────────────────────
    if (apiPath.startsWith('/terminology')) return route.fulfill(ok([]));

    // ── Organizations ──────────────────────────────────────────────────────
    if (apiPath.startsWith('/organizations')) return route.fulfill(ok([]));

    // ── Import ─────────────────────────────────────────────────────────────
    if (apiPath === '/guidelines/import' && method === 'POST') return route.fulfill(created({ id: uid('gl'), title: 'Imported Guideline', status: 'DRAFT' }));

    // Default fallback
    return route.fulfill(ok({}));
  });

  await page.route('**/health', async (route) =>
    route.fulfill(ok({ status: 'ok' })),
  );

  return state;
}

// ─── Legacy static mock (kept for backwards compat) ──────────────────────────

/**
 * @deprecated Use setupStatefulMocks() for new tests.
 * Kept so existing spec files continue to work unmodified.
 */
export async function setupApiMocks(page: Page) {
  return setupStatefulMocks(page);
}

// ─── Navigation helper ────────────────────────────────────────────────────────

/** Navigate to the app and wait for it to be ready. */
export async function navigateToApp(page: Page, path = '/') {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// ─── Workspace navigation helper ─────────────────────────────────────────────

/** Open the first guideline workspace from the guidelines list. */
export async function openPrimaryWorkspace(page: Page) {
  await page.getByRole('button', { name: /guidelines/i }).click();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Open guideline: Hypertension/i }).click();
  await page.waitForLoadState('networkidle');
}

/** Switch to a named workspace tab. */
export async function switchWorkspaceTab(page: Page, tabName: string) {
  const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
  await tabBar.getByRole('tab', { name: tabName, exact: true }).click();
  await page.waitForLoadState('networkidle');
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Unroute all API mocks for the given page.
 * Call in afterEach if you need explicit cleanup (normally not needed since
 * Playwright creates a fresh page per test).
 */
export async function cleanupMocks(page: Page) {
  await page.unroute('**/api/**');
  await page.unroute('**/health');
}
