import { Page } from '@playwright/test';

/** Mock data returned by the API routes */
export const mockData = {
  guidelines: [
    {
      id: 'gl-001',
      title: 'Hypertension Management Guidelines',
      shortName: 'HTN-2025',
      status: 'DRAFT',
      description: 'Evidence-based recommendations for hypertension management.',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'gl-002',
      title: 'Diabetes Care Standards',
      shortName: 'DCS-2025',
      status: 'PUBLISHED',
      description: 'Standards of care for patients with diabetes.',
      updatedAt: new Date().toISOString(),
    },
  ],

  guideline: {
    id: 'gl-001',
    title: 'Hypertension Management Guidelines',
    shortName: 'HTN-2025',
    status: 'DRAFT',
    description: 'Evidence-based recommendations for hypertension management.',
    showSectionNumbers: true,
    etdMode: 'FULL',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },

  sections: [
    {
      id: 'sec-001',
      title: 'Background',
      ordering: 0,
      parentId: null,
      guidelineId: 'gl-001',
      excludeFromNumbering: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: [],
    },
    {
      id: 'sec-002',
      title: 'Clinical Recommendations',
      ordering: 1,
      parentId: null,
      guidelineId: 'gl-001',
      excludeFromNumbering: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: [
        {
          id: 'sec-003',
          title: 'First-line Treatment',
          ordering: 0,
          parentId: 'sec-002',
          guidelineId: 'gl-001',
          excludeFromNumbering: false,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          children: [],
        },
      ],
    },
  ],

  recommendations: [
    {
      id: 'rec-001',
      title: 'ACE Inhibitors for Hypertension',
      content: 'We recommend ACE inhibitors as first-line treatment.',
      strength: 'STRONG',
      direction: 'FOR',
      status: 'DRAFT',
      sectionId: 'sec-002',
      guidelineId: 'gl-001',
      updatedAt: new Date().toISOString(),
    },
  ],

  references: [
    {
      id: 'ref-001',
      title: 'ACE Inhibitors Meta-Analysis 2023',
      authors: 'Smith J, et al.',
      year: 2023,
      journal: 'JAMA',
      guidelineId: 'gl-001',
    },
  ],

  dashboardStats: {
    guidelines: 2,
    sections: 3,
    recommendations: 1,
  },
};

/**
 * A catch-all API mock handler. Routes all /api/** requests based on path inspection.
 * Uses a single route to avoid conflicts between multiple handlers.
 */
export async function setupApiMocks(page: Page) {
  await page.route('**/api/**', async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const path = url.pathname; // e.g. "/api/guidelines"

    // Remove /api prefix for matching
    const apiPath = path.replace(/^\/api/, ''); // e.g. "/guidelines"

    // Health check
    if (apiPath === '/health' || path === '/health') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    }

    // Dashboard stats: GET /api/guidelines/stats
    if (apiPath === '/guidelines/stats' && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.dashboardStats) });
    }

    // Single guideline sub-resources: /guidelines/:id/permissions, /guidelines/:id/sections, etc.
    const guidelineSubMatch = apiPath.match(/^\/guidelines\/([^/]+)\/(.+)$/);
    if (guidelineSubMatch) {
      const subResource = guidelineSubMatch[2];
      if (subResource === 'permissions') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (subResource === 'export/docx') {
        return route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: '' });
      }
      // Other sub-resources (decision-aid, etc.)
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }

    // Single guideline: GET/PATCH /api/guidelines/:id
    const guidelineSingleMatch = apiPath.match(/^\/guidelines\/([^/]+)$/);
    if (guidelineSingleMatch) {
      const id = guidelineSingleMatch[1];
      if (method === 'GET') {
        const g = mockData.guidelines.find((gl) => gl.id === id);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(g ? { ...mockData.guideline, ...g } : mockData.guideline) });
      }
      if (method === 'PATCH' || method === 'PUT') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.guideline) });
      }
      if (method === 'DELETE') {
        return route.fulfill({ status: 204 });
      }
    }

    // Guidelines list: GET/POST /api/guidelines
    if (apiPath === '/guidelines') {
      if (method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.guidelines) });
      }
      if (method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 201, contentType: 'application/json',
          body: JSON.stringify({ id: 'gl-new', title: body.title, shortName: body.shortName || null, status: 'DRAFT', description: null, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() }),
        });
      }
    }

    // Sections: /api/sections
    if (apiPath === '/sections' || apiPath.startsWith('/sections/')) {
      if (method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.sections) });
      }
      if (method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'sec-new', title: body.title, ordering: 10, parentId: body.parentId || null, guidelineId: body.guidelineId, children: [], excludeFromNumbering: false, isDeleted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }) });
      }
      if (method === 'DELETE') { return route.fulfill({ status: 204 }); }
      if (method === 'PATCH' || method === 'PUT') { return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }); }
    }

    // Recommendations: /api/recommendations
    if (apiPath === '/recommendations' || apiPath.startsWith('/recommendations/')) {
      if (method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.recommendations) });
      }
      if (method === 'POST') { return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(mockData.recommendations[0]) }); }
      if (method === 'PUT' || method === 'PATCH') { return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.recommendations[0]) }); }
      if (method === 'DELETE') { return route.fulfill({ status: 204 }); }
    }

    // References: /api/references
    if (apiPath === '/references' || apiPath.startsWith('/references/')) {
      if (method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.references) });
      }
      if (method === 'POST') { return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(mockData.references[0]) }); }
      if (method === 'PUT' || method === 'PATCH') { return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.references[0]) }); }
      if (method === 'DELETE') { return route.fulfill({ status: 204 }); }
    }

    // Picos: /api/picos
    if (apiPath === '/picos' || apiPath.startsWith('/picos/')) {
      if (method === 'GET') { return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }

    // Activity: /api/activity
    if (apiPath === '/activity' || apiPath.startsWith('/activity/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }) });
    }

    // Versions: /api/versions
    if (apiPath === '/versions' || apiPath.startsWith('/versions/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    // Tasks: /api/tasks
    if (apiPath === '/tasks' || apiPath.startsWith('/tasks/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    // Polls: /api/polls
    if (apiPath === '/polls' || apiPath.startsWith('/polls/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    // Milestones: /api/milestones
    if (apiPath === '/milestones' || apiPath.startsWith('/milestones/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    // COI: /api/coi
    if (apiPath === '/coi' || apiPath.startsWith('/coi/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    // Outcomes: /api/outcomes
    if (apiPath === '/outcomes' || apiPath.startsWith('/outcomes/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    // Links: /api/links
    if (apiPath === '/links' || apiPath.startsWith('/links/')) {
      if (method === 'GET') { return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }); }
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({}) });
    }

    // Comments: /api/comments
    if (apiPath === '/comments' || apiPath.startsWith('/comments/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    // Organizations: /api/organizations
    if (apiPath === '/organizations' || apiPath.startsWith('/organizations/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    // FHIR: /api/fhir
    if (apiPath.startsWith('/fhir/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }

    // Terminology: /api/terminology
    if (apiPath.startsWith('/terminology/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    // Health: /health (root level, not under /api)
    if (path === '/health') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    }

    // Default: return empty 200
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  // Also handle root-level health endpoint (not under /api)
  await page.route('**/health', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
  });
}

/** Navigate to the app and wait for it to be ready */
export async function navigateToApp(page: Page, path = '/') {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}
