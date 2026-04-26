import { NotFoundException } from '@nestjs/common';
import { FhirController } from './fhir.controller';
import { GuidelineCompositionProjection } from './projections/guideline-to-composition';
import { ReferenceCitationProjection } from './projections/reference-to-citation';
import { RecommendationPlanDefinitionProjection } from './projections/recommendation-to-plan-definition';
import { PicoEvidenceProjection } from './projections/pico-to-evidence';
import { FhirValidationService } from './fhir-validation.service';

const GUIDELINE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const REC_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PICO_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const REF_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const mockGuideline = {
  id: GUIDELINE_ID,
  title: 'Test Guideline',
  status: 'PUBLISHED',
  isDeleted: false,
  updatedAt: new Date('2024-01-01'),
  sections: [],
  references: [{ id: REF_ID, title: 'Test Reference', isDeleted: false }],
  recommendations: [
    { id: REC_ID, title: 'Test Recommendation', isDeleted: false },
  ],
  picos: [
    {
      id: PICO_ID,
      population: 'Adults',
      intervention: 'Drug A',
      comparator: 'Placebo',
      isDeleted: false,
      outcomes: [],
      codes: [],
    },
  ],
};

function buildController(findUniqueResult: any): FhirController {
  const mockPrisma: any = {
    guideline: {
      findUnique: jest.fn().mockResolvedValue(findUniqueResult),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };

  return new FhirController(
    mockPrisma,
    new GuidelineCompositionProjection(),
    new ReferenceCitationProjection(),
    new RecommendationPlanDefinitionProjection(),
    new PicoEvidenceProjection(),
    new FhirValidationService(),
  );
}

describe('FhirController - Bundle endpoints', () => {
  describe('GET /fhir/Bundle/:guidelineId', () => {
    it('returns a Bundle with type "document"', async () => {
      const controller = buildController(mockGuideline);

      const result = (await controller.getBundle(GUIDELINE_ID)) as any;

      expect(result.resourceType).toBe('Bundle');
      expect(result.type).toBe('document');
      expect(result.id).toBe(GUIDELINE_ID);
    });

    it('has Composition as the first entry', async () => {
      const controller = buildController(mockGuideline);

      const result = (await controller.getBundle(GUIDELINE_ID)) as any;

      expect(result.entry).toBeDefined();
      expect(result.entry.length).toBeGreaterThan(0);
      const firstEntry = result.entry[0];
      expect(firstEntry.fullUrl).toBe(`urn:uuid:${GUIDELINE_ID}`);
      expect((firstEntry.resource as any).resourceType).toBe('Composition');
    });

    it('includes PlanDefinition entries for each recommendation', async () => {
      const controller = buildController(mockGuideline);

      const result = (await controller.getBundle(GUIDELINE_ID)) as any;

      const planDefinitionEntries = result.entry.filter(
        (e: any) => e.resource.resourceType === 'PlanDefinition',
      );
      expect(planDefinitionEntries).toHaveLength(1);
      expect(planDefinitionEntries[0].fullUrl).toBe(`urn:uuid:${REC_ID}`);
    });

    it('includes Evidence entries for each PICO', async () => {
      const controller = buildController(mockGuideline);

      const result = (await controller.getBundle(GUIDELINE_ID)) as any;

      const evidenceEntries = result.entry.filter(
        (e: any) => e.resource.resourceType === 'Evidence',
      );
      expect(evidenceEntries).toHaveLength(1);
      expect(evidenceEntries[0].fullUrl).toBe(`urn:uuid:${PICO_ID}`);
    });

    it('includes Citation entries for each reference', async () => {
      const controller = buildController(mockGuideline);

      const result = (await controller.getBundle(GUIDELINE_ID)) as any;

      const citationEntries = result.entry.filter(
        (e: any) => e.resource.resourceType === 'Citation',
      );
      expect(citationEntries).toHaveLength(1);
      expect(citationEntries[0].fullUrl).toBe(`urn:uuid:${REF_ID}`);
    });

    it('returns 404 for an unknown guideline', async () => {
      const controller = buildController(null);

      await expect(controller.getBundle(GUIDELINE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
