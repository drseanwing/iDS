import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GradeProImportService } from './gradepro-import.service';
import { GradeProParserService } from './gradepro-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import type { GradeProExport } from './gradepro-parser.service';

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockTx = {
  pico: { create: jest.fn() },
  outcome: { create: jest.fn() },
  recommendation: { create: jest.fn() },
};

const mockPrismaService = {
  guideline: { findUnique: jest.fn() },
  pico: { create: jest.fn() },
  outcome: { create: jest.fn() },
  recommendation: { create: jest.fn() },
  $transaction: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExport(overrides?: Partial<GradeProExport>): GradeProExport {
  return {
    version: '1.0',
    profile: { name: 'Test Profile' },
    questions: [
      {
        id: 'q1',
        question: 'Should we use intervention X?',
        population: 'Adults with condition Y',
        intervention: 'Intervention X',
        comparator: 'Placebo',
        outcomes: [
          {
            id: 'o1',
            name: 'Mortality',
            type: 'CRITICAL',
            riskOfBias: 'NO_LIMITATION',
            inconsistency: 'NO_SERIOUS',
            indirectness: 'NO_SERIOUS',
            imprecision: 'SERIOUS',
            publicationBias: 'NO_SUSPECTED',
            certainty: 'MODERATE',
          },
        ],
        recommendations: [
          {
            id: 'r1',
            text: 'We recommend using intervention X',
            direction: 'FOR',
            strength: 'STRONG',
          },
        ],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GradeProParserService', () => {
  let parser: GradeProParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GradeProParserService],
    }).compile();
    parser = module.get<GradeProParserService>(GradeProParserService);
  });

  it('throws BadRequestException on invalid JSON', () => {
    expect(() => parser.parseGradeProJson('not-json{')).toThrow(BadRequestException);
    expect(() => parser.parseGradeProJson('not-json{')).toThrow('Invalid JSON');
  });
});

describe('GradeProImportService', () => {
  let service: GradeProImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeProImportService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GradeProImportService>(GradeProImportService);
    jest.clearAllMocks();

    // Default: guideline exists
    mockPrismaService.guideline.findUnique.mockResolvedValue({ id: 'guideline-1' });

    // Default transaction implementation
    mockPrismaService.$transaction.mockImplementation(
      async (cb: (tx: typeof mockTx) => Promise<void>) => {
        mockTx.pico.create.mockResolvedValue({ id: 'new-pico-id' });
        mockTx.outcome.create.mockResolvedValue({});
        mockTx.recommendation.create.mockResolvedValue({});
        await cb(mockTx);
      },
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────
  it('throws NotFoundException when guideline does not exist', async () => {
    mockPrismaService.guideline.findUnique.mockResolvedValue(null);

    await expect(
      service.importToGuideline('missing-guid', makeExport()),
    ).rejects.toThrow(NotFoundException);
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────
  it('returns zero counts when questions array is empty', async () => {
    const result = await service.importToGuideline('guideline-1', { questions: [] });

    expect(result).toEqual({
      created: { picos: 0, outcomes: 0, recommendations: 0 },
      skipped: 0,
      errors: [],
    });
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────
  it('creates PICO, outcomes, and recommendations correctly', async () => {
    const result = await service.importToGuideline('guideline-1', makeExport());

    expect(result.created.picos).toBe(1);
    expect(result.created.outcomes).toBe(1);
    expect(result.created.recommendations).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);

    // Verify PICO was created with correct fields
    expect(mockTx.pico.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          guidelineId: 'guideline-1',
          population: 'Adults with condition Y',
          intervention: 'Intervention X',
          comparator: 'Placebo',
          importSource: 'GRADEPRO',
        }),
      }),
    );

    // Verify outcome mapping (imprecision: SERIOUS → SERIOUS)
    expect(mockTx.outcome.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Mortality',
          imprecision: 'SERIOUS',
          riskOfBias: 'NOT_SERIOUS',
        }),
      }),
    );

    // Verify recommendation strength (FOR + STRONG → STRONG_FOR)
    expect(mockTx.recommendation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          strength: 'STRONG_FOR',
        }),
      }),
    );
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────
  it('skips questions that have neither id nor question text', async () => {
    const exportData: GradeProExport = {
      questions: [
        { id: undefined, question: undefined, outcomes: [] }, // malformed — skip
        { id: 'q2', question: 'Valid question', outcomes: [] }, // valid
      ],
    };

    const result = await service.importToGuideline('guideline-1', exportData);

    expect(result.skipped).toBe(1);
    expect(result.created.picos).toBe(1);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────
  it('wraps all inserts in a single $transaction call', async () => {
    await service.importToGuideline('guideline-1', makeExport());

    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────
  it('sets importSource to GRADEPRO on created PICO records', async () => {
    await service.importToGuideline('guideline-1', makeExport());

    const picoCreateCall = mockTx.pico.create.mock.calls[0][0];
    expect(picoCreateCall.data.importSource).toBe('GRADEPRO');
  });
});
