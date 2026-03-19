import { FhirValidationService } from './fhir-validation.service';

describe('FhirValidationService', () => {
  let service: FhirValidationService;

  beforeEach(() => {
    service = new FhirValidationService();
  });

  // ── Base field validation ─────────────────────────────────────────────────

  describe('base field validation', () => {
    it('should reject null input', () => {
      const result = service.validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Resource must be a non-null object');
    });

    it('should reject non-object input', () => {
      const result = service.validate('not-an-object');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Resource must be a non-null object');
    });

    it('should report error when resourceType is missing', () => {
      const result = service.validate({ id: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('resourceType'))).toBe(true);
    });

    it('should report error when resourceType is not a string', () => {
      const result = service.validate({ resourceType: 123, id: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('resourceType'))).toBe(true);
    });

    it('should report error when id is missing', () => {
      const result = service.validate({ resourceType: 'Unknown' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('id'))).toBe(true);
    });

    it('should report error when meta is not an object', () => {
      const result = service.validate({ resourceType: 'Unknown', id: 'x', meta: 'bad' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('meta'))).toBe(true);
    });

    it('should report error when meta is an array', () => {
      const result = service.validate({ resourceType: 'Unknown', id: 'x', meta: [] });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('meta'))).toBe(true);
    });

    it('should report error when meta.profile is not an array', () => {
      const result = service.validate({
        resourceType: 'Unknown',
        id: 'x',
        meta: { profile: 'not-an-array' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('meta.profile'))).toBe(true);
    });

    it('should accept valid meta.profile array', () => {
      // Use unknown resource type so only base checks run
      const result = service.validate({
        resourceType: 'Unknown',
        id: 'x',
        meta: { profile: ['http://example.com'] },
      });
      // Only id and resourceType pass; should have no meta errors
      expect(result.errors.some((e) => e.includes('meta'))).toBe(false);
    });

    it('should return valid for unknown resource type with base fields present', () => {
      const result = service.validate({ resourceType: 'SomeCustomType', id: 'abc' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── Composition validation ────────────────────────────────────────────────

  describe('Composition validation', () => {
    const validComposition = {
      resourceType: 'Composition',
      id: 'comp-1',
      status: 'final',
      type: {
        coding: [
          { system: 'http://loinc.org', code: '57024-2', display: 'Health Quality Measure Document' },
        ],
      },
      section: [{ title: 'Background' }],
    };

    it('should validate a well-formed Composition as valid', () => {
      const result = service.validate(validComposition);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject Composition missing status', () => {
      const { status: _s, ...noStatus } = validComposition;
      const result = service.validate(noStatus);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });

    it('should reject Composition with non-string status', () => {
      const result = service.validate({ ...validComposition, status: 42 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });

    it('should reject Composition missing type', () => {
      const { type: _t, ...noType } = validComposition;
      const result = service.validate(noType);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('type'))).toBe(true);
    });

    it('should reject Composition with non-object type', () => {
      const result = service.validate({ ...validComposition, type: 'loinc' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('type'))).toBe(true);
    });

    it('should reject Composition with empty type.coding', () => {
      const result = service.validate({ ...validComposition, type: { coding: [] } });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('type.coding'))).toBe(true);
    });

    it('should reject Composition with non-array type.coding', () => {
      const result = service.validate({ ...validComposition, type: { coding: 'loinc' } });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('type.coding'))).toBe(true);
    });

    it('should reject Composition missing section', () => {
      const { section: _s, ...noSection } = validComposition;
      const result = service.validate(noSection);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('section'))).toBe(true);
    });

    it('should reject Composition with non-array section', () => {
      const result = service.validate({ ...validComposition, section: 'intro' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('section'))).toBe(true);
    });

    it('should accept Composition with empty section array', () => {
      const result = service.validate({ ...validComposition, section: [] });
      expect(result.valid).toBe(true);
    });
  });

  // ── PlanDefinition validation ─────────────────────────────────────────────

  describe('PlanDefinition validation', () => {
    const validPlanDefinition = {
      resourceType: 'PlanDefinition',
      id: 'pd-1',
      status: 'active',
      action: [{ title: 'Perform hand hygiene' }],
    };

    it('should validate a well-formed PlanDefinition as valid', () => {
      const result = service.validate(validPlanDefinition);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject PlanDefinition missing status', () => {
      const { status: _s, ...noStatus } = validPlanDefinition;
      const result = service.validate(noStatus);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });

    it('should reject PlanDefinition with non-string status', () => {
      const result = service.validate({ ...validPlanDefinition, status: false });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });

    it('should reject PlanDefinition missing action', () => {
      const { action: _a, ...noAction } = validPlanDefinition;
      const result = service.validate(noAction);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('action'))).toBe(true);
    });

    it('should reject PlanDefinition with non-array action', () => {
      const result = service.validate({ ...validPlanDefinition, action: {} });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('action'))).toBe(true);
    });

    it('should accept PlanDefinition with empty action array', () => {
      const result = service.validate({ ...validPlanDefinition, action: [] });
      expect(result.valid).toBe(true);
    });
  });

  // ── Evidence validation ───────────────────────────────────────────────────

  describe('Evidence validation', () => {
    const validEvidence = {
      resourceType: 'Evidence',
      id: 'ev-1',
      status: 'active',
    };

    it('should validate a well-formed Evidence as valid', () => {
      const result = service.validate(validEvidence);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject Evidence missing status', () => {
      const { status: _s, ...noStatus } = validEvidence;
      const result = service.validate(noStatus);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });

    it('should reject Evidence with non-string status', () => {
      const result = service.validate({ ...validEvidence, status: null });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });
  });

  // ── Citation validation ───────────────────────────────────────────────────

  describe('Citation validation', () => {
    const validCitation = {
      resourceType: 'Citation',
      id: 'cit-1',
      status: 'active',
    };

    it('should validate a well-formed Citation as valid', () => {
      const result = service.validate(validCitation);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject Citation missing status', () => {
      const { status: _s, ...noStatus } = validCitation;
      const result = service.validate(noStatus);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });

    it('should reject Citation with non-string status', () => {
      const result = service.validate({ ...validCitation, status: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });
  });

  // ── Bundle validation ─────────────────────────────────────────────────────

  describe('Bundle validation', () => {
    const validBundle = {
      resourceType: 'Bundle',
      id: 'bundle-1',
      type: 'document',
      entry: [
        { resource: { resourceType: 'Composition', id: 'comp-1' } },
        { resource: { resourceType: 'Citation', id: 'cit-1' } },
      ],
    };

    it('should validate a well-formed Bundle as valid', () => {
      const result = service.validate(validBundle);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject Bundle missing type', () => {
      const { type: _t, ...noType } = validBundle;
      const result = service.validate(noType);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('type'))).toBe(true);
    });

    it('should reject Bundle with non-string type', () => {
      const result = service.validate({ ...validBundle, type: { coding: [] } });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('type'))).toBe(true);
    });

    it('should reject Bundle missing entry', () => {
      const { entry: _e, ...noEntry } = validBundle;
      const result = service.validate(noEntry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('entry'))).toBe(true);
    });

    it('should reject Bundle with non-array entry', () => {
      const result = service.validate({ ...validBundle, entry: {} });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('entry'))).toBe(true);
    });

    it('should reject Bundle with empty entry array', () => {
      const result = service.validate({ ...validBundle, entry: [] });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('entry array must not be empty'))).toBe(true);
    });

    it('should reject Bundle whose first entry resource is not a Composition', () => {
      const result = service.validate({
        ...validBundle,
        entry: [{ resource: { resourceType: 'Citation', id: 'cit-1' } }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Composition'))).toBe(true);
    });

    it('should reject Bundle whose first entry has no resource', () => {
      const result = service.validate({
        ...validBundle,
        entry: [{}],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Composition'))).toBe(true);
    });
  });

  // ── Return shape ──────────────────────────────────────────────────────────

  it('should always return a valid boolean and errors array', () => {
    const result = service.validate({ resourceType: 'SomeType', id: 'x' });
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('should accumulate multiple errors in a single call', () => {
    // Missing both resourceType and id
    const result = service.validate({});
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
