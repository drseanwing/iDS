/**
 * Performance tests for FHIR bundle construction.
 */

import { createLargeGuideline } from './fixtures/large-guideline';

// Lightweight FHIR bundle builder (mirrors typical patterns in fhir projections)
function buildFhirBundle(resources: any[]): any {
  return {
    resourceType: 'Bundle',
    id: `bundle-${Date.now()}`,
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: resources.length,
    entry: resources.map((resource) => ({
      fullUrl: `urn:uuid:${resource.id}`,
      resource,
    })),
  };
}

function guidelineToComposition(guideline: any, sections: any[]): any {
  return {
    resourceType: 'Composition',
    id: guideline.id,
    status: 'final',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '11503-0',
          display: 'Medical records',
        },
      ],
    },
    title: guideline.title,
    date: new Date().toISOString(),
    section: sections.map((s) => ({
      title: s.title,
      text: { status: 'generated', div: `<div>${s.title}</div>` },
    })),
  };
}

function recommendationToPlanDefinition(rec: any): any {
  return {
    resourceType: 'PlanDefinition',
    id: rec.id,
    status: 'active',
    title: rec.title,
    type: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/plan-definition-type', code: 'clinical-protocol' }],
    },
    action: [
      {
        title: rec.title,
        description: rec.strength ? `${rec.strength} recommendation` : undefined,
      },
    ],
  };
}

function referenceToCitation(ref: any): any {
  return {
    resourceType: 'Citation',
    id: ref.id,
    status: 'active',
    title: ref.title,
    citedArtifact: {
      title: [{ text: ref.title }],
      publicationForm: [
        {
          publishedIn: { publisher: { display: ref.journal } },
          articleDate: ref.year ? `${ref.year}` : undefined,
        },
      ],
      identifier: ref.doi ? [{ system: 'https://doi.org', value: ref.doi }] : [],
    },
  };
}

describe('FHIR Bundle Performance', () => {
  it('should create FHIR Bundle with 100 resources in < 1 second', () => {
    const data = createLargeGuideline({ sectionCount: 50, outcomesPerPico: 3 });

    const start = performance.now();

    const resources: any[] = [];

    // Composition
    resources.push(guidelineToComposition(data.guideline, data.flatSections));

    // Recommendations -> PlanDefinition
    for (const rec of data.recommendations.slice(0, 40)) {
      resources.push(recommendationToPlanDefinition(rec));
    }

    // References -> Citation
    for (const ref of data.references.slice(0, 40)) {
      resources.push(referenceToCitation(ref));
    }

    // Additional simple resources to reach 100
    for (let i = resources.length; i < 100; i++) {
      resources.push({
        resourceType: 'Basic',
        id: `basic-${i}`,
        code: { coding: [{ system: 'http://example.org', code: `code-${i}` }] },
      });
    }

    const bundle = buildFhirBundle(resources);

    const elapsed = performance.now() - start;

    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.entry.length).toBe(100);
    expect(elapsed).toBeLessThan(1000);
  });

  it('should serialize FHIR Bundle with 100 resources to JSON in < 200ms', () => {
    const resources = Array.from({ length: 100 }, (_, i) => ({
      resourceType: 'Basic',
      id: `resource-${i}`,
      meta: { lastUpdated: new Date().toISOString() },
      code: {
        coding: [
          {
            system: 'http://example.org/codes',
            code: `CODE-${i}`,
            display: `Resource ${i}`,
          },
        ],
      },
      extension: Array.from({ length: 5 }, (__, j) => ({
        url: `http://example.org/extension-${j}`,
        valueString: `value-${i}-${j}`,
      })),
    }));

    const bundle = buildFhirBundle(resources);

    const start = performance.now();
    const json = JSON.stringify(bundle);
    const parsed = JSON.parse(json);
    const elapsed = performance.now() - start;

    expect(parsed.total).toBe(100);
    expect(elapsed).toBeLessThan(200);
  });

  it('should build guideline FHIR bundle with projections in < 2 seconds', () => {
    const data = createLargeGuideline({
      sectionCount: 80,
      recsPerSection: 2,
      outcomesPerPico: 4,
    });

    const start = performance.now();

    const resources: any[] = [
      guidelineToComposition(data.guideline, data.flatSections),
      ...data.recommendations.map(recommendationToPlanDefinition),
      ...data.references.map(referenceToCitation),
    ];

    const bundle = buildFhirBundle(resources);

    const elapsed = performance.now() - start;

    expect(bundle.entry.length).toBeGreaterThan(0);
    expect(bundle.type).toBe('collection');
    expect(elapsed).toBeLessThan(2000);
  });
});
