import { FhirController } from './fhir.controller';
import { PrismaService } from '../prisma/prisma.service';
import { GuidelineCompositionProjection } from './projections/guideline-to-composition';
import { ReferenceCitationProjection } from './projections/reference-to-citation';
import { RecommendationPlanDefinitionProjection } from './projections/recommendation-to-plan-definition';
import { PicoEvidenceProjection } from './projections/pico-to-evidence';
import { FhirValidationService } from './fhir-validation.service';

// Minimal mock request helper
function mockReq(url = '/fhir/test') {
  return {
    protocol: 'http',
    get: (header: string) => (header === 'host' ? 'localhost:3000' : ''),
    originalUrl: url,
  } as any;
}

describe('FhirController — CapabilityStatement & search-type interactions', () => {
  let controller: FhirController;

  // ── Mocks ────────────────────────────────────────────────────

  const mockPrisma = {
    reference: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    recommendation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pico: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService;

  const mockCitationProjection = {
    toCitation: jest.fn((ref: any) => ({
      resourceType: 'Citation',
      id: ref.id,
      status: 'active',
    })),
  } as unknown as ReferenceCitationProjection;

  const mockPlanDefinitionProjection = {
    toPlanDefinition: jest.fn((rec: any) => ({
      resourceType: 'PlanDefinition',
      id: rec.id,
      status: 'active',
    })),
  } as unknown as RecommendationPlanDefinitionProjection;

  const mockEvidenceProjection = {
    toEvidence: jest.fn((pico: any) => ({
      resourceType: 'Evidence',
      id: pico.id,
      status: 'active',
    })),
  } as unknown as PicoEvidenceProjection;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FhirController(
      mockPrisma,
      {} as GuidelineCompositionProjection,
      mockCitationProjection,
      mockPlanDefinitionProjection,
      mockEvidenceProjection,
      {} as FhirValidationService,
    );
  });

  // ── CapabilityStatement ─────────────────────────────────────

  describe('GET /fhir/metadata', () => {
    it('should return a CapabilityStatement resource', () => {
      const result = controller.getMetadata() as any;
      expect(result.resourceType).toBe('CapabilityStatement');
    });

    it('should have required top-level fields', () => {
      const result = controller.getMetadata() as any;
      expect(result.status).toBe('active');
      expect(result.kind).toBe('instance');
      expect(result.fhirVersion).toBe('5.0.0');
      expect(result.format).toContain('application/fhir+json');
      expect(result.name).toBe('OpenGRADECapabilityStatement');
      expect(result.title).toBe('OpenGRADE FHIR Facade');
    });

    it('should include software block', () => {
      const result = controller.getMetadata() as any;
      expect(result.software).toEqual({ name: 'OpenGRADE', version: '1.0.0' });
    });

    it('should include a rest array with mode server', () => {
      const result = controller.getMetadata() as any;
      expect(Array.isArray(result.rest)).toBe(true);
      expect(result.rest[0].mode).toBe('server');
    });

    it('should list all 8 supported resource types', () => {
      const result = controller.getMetadata() as any;
      const types = result.rest[0].resource.map((r: any) => r.type);
      expect(types).toContain('Composition');
      expect(types).toContain('Citation');
      expect(types).toContain('PlanDefinition');
      expect(types).toContain('Evidence');
      expect(types).toContain('Bundle');
      expect(types).toContain('Provenance');
      expect(types).toContain('AuditEvent');
      expect(types).toContain('OperationDefinition');
      expect(types).toHaveLength(8);
    });

    it('should list correct interactions for PlanDefinition', () => {
      const result = controller.getMetadata() as any;
      const pd = result.rest[0].resource.find((r: any) => r.type === 'PlanDefinition');
      const codes = pd.interaction.map((i: any) => i.code);
      expect(codes).toContain('read');
      expect(codes).toContain('search-type');
    });

    it('should include date as an ISO string', () => {
      const result = controller.getMetadata() as any;
      expect(() => new Date(result.date)).not.toThrow();
      expect(new Date(result.date).toISOString()).toBe(result.date);
    });
  });

  // ── PlanDefinition search ───────────────────────────────────

  describe('GET /fhir/PlanDefinition (search)', () => {
    const sampleRecs = [
      { id: 'rec-1', recStatus: 'active', title: 'Wash hands' },
      { id: 'rec-2', recStatus: 'active', title: 'Use PPE' },
    ];

    beforeEach(() => {
      (mockPrisma.recommendation.findMany as jest.Mock).mockResolvedValue(sampleRecs);
      (mockPrisma.recommendation.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return a Bundle resource', async () => {
      const result = await controller.searchPlanDefinition(mockReq()) as any;
      expect(result.resourceType).toBe('Bundle');
    });

    it('should return type searchset', async () => {
      const result = await controller.searchPlanDefinition(mockReq()) as any;
      expect(result.type).toBe('searchset');
    });

    it('should return the correct total', async () => {
      const result = await controller.searchPlanDefinition(mockReq()) as any;
      expect(result.total).toBe(2);
    });

    it('should include a self link', async () => {
      const result = await controller.searchPlanDefinition(mockReq('/fhir/PlanDefinition')) as any;
      expect(result.link).toHaveLength(1);
      expect(result.link[0].relation).toBe('self');
      expect(typeof result.link[0].url).toBe('string');
    });

    it('should wrap each recommendation as an entry with fullUrl and resource', async () => {
      const result = await controller.searchPlanDefinition(mockReq()) as any;
      expect(result.entry).toHaveLength(2);
      expect(result.entry[0].fullUrl).toBe('urn:uuid:rec-1');
      expect(result.entry[0].resource.resourceType).toBe('PlanDefinition');
    });

    it('should apply status filter to the prisma query', async () => {
      await controller.searchPlanDefinition(mockReq(), undefined, 'draft');
      const call = (mockPrisma.recommendation.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.recStatus).toBe('draft');
    });

    it('should apply title filter to the prisma query', async () => {
      await controller.searchPlanDefinition(mockReq(), undefined, undefined, 'hygiene');
      const call = (mockPrisma.recommendation.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.title).toEqual({ contains: 'hygiene', mode: 'insensitive' });
    });

    it('should respect _count and _offset pagination', async () => {
      await controller.searchPlanDefinition(mockReq(), undefined, undefined, undefined, '5', '10');
      const call = (mockPrisma.recommendation.findMany as jest.Mock).mock.calls[0][0];
      expect(call.take).toBe(5);
      expect(call.skip).toBe(10);
    });
  });

  // ── Evidence search ──────────────────────────────────────────

  describe('GET /fhir/Evidence (search)', () => {
    const samplePicos = [
      { id: 'pico-1', outcomes: [], codes: [] },
      { id: 'pico-2', outcomes: [], codes: [] },
    ];

    beforeEach(() => {
      (mockPrisma.pico.findMany as jest.Mock).mockResolvedValue(samplePicos);
      (mockPrisma.pico.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return a Bundle resource', async () => {
      const result = await controller.searchEvidence(mockReq()) as any;
      expect(result.resourceType).toBe('Bundle');
    });

    it('should return type searchset', async () => {
      const result = await controller.searchEvidence(mockReq()) as any;
      expect(result.type).toBe('searchset');
    });

    it('should return the correct total', async () => {
      const result = await controller.searchEvidence(mockReq()) as any;
      expect(result.total).toBe(2);
    });

    it('should include a self link', async () => {
      const result = await controller.searchEvidence(mockReq('/fhir/Evidence')) as any;
      expect(result.link[0].relation).toBe('self');
    });

    it('should wrap each PICO as an entry with fullUrl and resource', async () => {
      const result = await controller.searchEvidence(mockReq()) as any;
      expect(result.entry).toHaveLength(2);
      expect(result.entry[0].fullUrl).toBe('urn:uuid:pico-1');
      expect(result.entry[0].resource.resourceType).toBe('Evidence');
    });

    it('should filter by _id when provided', async () => {
      await controller.searchEvidence(mockReq(), 'pico-1');
      const call = (mockPrisma.pico.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.id).toBe('pico-1');
    });

    it('should respect _count and _offset pagination', async () => {
      await controller.searchEvidence(mockReq(), undefined, '10', '5');
      const call = (mockPrisma.pico.findMany as jest.Mock).mock.calls[0][0];
      expect(call.take).toBe(10);
      expect(call.skip).toBe(5);
    });
  });

  // ── Citation search ──────────────────────────────────────────

  describe('GET /fhir/Citation (search)', () => {
    const sampleRefs = [
      { id: 'ref-1', title: 'Smith et al. 2020', isDeleted: false },
      { id: 'ref-2', title: 'Jones et al. 2021', isDeleted: false },
    ];

    beforeEach(() => {
      (mockPrisma.reference.findMany as jest.Mock).mockResolvedValue(sampleRefs);
      (mockPrisma.reference.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return a Bundle resource', async () => {
      const result = await controller.searchCitation(mockReq()) as any;
      expect(result.resourceType).toBe('Bundle');
    });

    it('should return type searchset', async () => {
      const result = await controller.searchCitation(mockReq()) as any;
      expect(result.type).toBe('searchset');
    });

    it('should return the correct total', async () => {
      const result = await controller.searchCitation(mockReq()) as any;
      expect(result.total).toBe(2);
    });

    it('should include a self link', async () => {
      const result = await controller.searchCitation(mockReq('/fhir/Citation')) as any;
      expect(result.link[0].relation).toBe('self');
    });

    it('should wrap each reference as an entry with fullUrl and resource', async () => {
      const result = await controller.searchCitation(mockReq()) as any;
      expect(result.entry).toHaveLength(2);
      expect(result.entry[0].fullUrl).toBe('urn:uuid:ref-1');
      expect(result.entry[0].resource.resourceType).toBe('Citation');
    });

    it('should apply title filter to the prisma query', async () => {
      await controller.searchCitation(mockReq(), undefined, 'Smith');
      const call = (mockPrisma.reference.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.title).toEqual({ contains: 'Smith', mode: 'insensitive' });
    });

    it('should filter by _id when provided', async () => {
      await controller.searchCitation(mockReq(), 'ref-1');
      const call = (mockPrisma.reference.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.id).toBe('ref-1');
    });

    it('should respect _count and _offset pagination', async () => {
      await controller.searchCitation(mockReq(), undefined, undefined, '15', '30');
      const call = (mockPrisma.reference.findMany as jest.Mock).mock.calls[0][0];
      expect(call.take).toBe(15);
      expect(call.skip).toBe(30);
    });
  });
});
