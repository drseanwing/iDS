import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { TerminologyService, TerminologySearchResult } from './terminology.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CacheManagerMock {
  get: jest.Mock;
  set: jest.Mock;
}

interface ConfigOverrides {
  apiKey?: string;
  baseUrl?: string;
}

async function buildService(
  overrides: ConfigOverrides = {},
  cacheMock: CacheManagerMock = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) },
): Promise<{ service: TerminologyService; cache: CacheManagerMock }> {
  const configMap: Record<string, unknown> = {
    'terminology.bioportalApiKey': overrides.apiKey ?? 'test-api-key',
    'terminology.bioportalBaseUrl': overrides.baseUrl ?? 'https://data.bioontology.org',
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      TerminologyService,
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, defaultValue?: unknown) => configMap[key] ?? defaultValue,
        },
      },
      {
        provide: CACHE_MANAGER,
        useValue: cacheMock,
      },
    ],
  }).compile();

  return { service: moduleRef.get(TerminologyService), cache: cacheMock };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TerminologyService', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- stub fallback (no API key) ------------------------------------------

  describe('stub fallback (no API key configured)', () => {
    it('returns matching stub results without calling BioPortal or the cache', async () => {
      const { service } = await buildService({ apiKey: '' });
      const result = await service.search('SNOMED_CT', 'diabetes', 5);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.results.length).toBeGreaterThan(0);
      for (const entry of result.results) {
        expect(entry.system).toBe('SNOMED_CT');
        expect(entry.display.toLowerCase()).toContain('diabetes');
      }
    });

    it('returns empty results when query does not match any stub entry', async () => {
      const { service } = await buildService({ apiKey: '' });
      const result = await service.search('SNOMED_CT', 'zzznomatch', 10);
      expect(result.results).toHaveLength(0);
    });
  });

  // ---- cache behaviour -------------------------------------------------------

  describe('Redis caching', () => {
    it('returns the cached value on a second identical call without re-fetching', async () => {
      const cachedResult: TerminologySearchResult = {
        results: [{ code: '38341003', display: 'Hypertension', system: 'SNOMED_CT' }],
      };
      // First call: cache miss. Second call: cache hit.
      const cacheMock: CacheManagerMock = {
        get: jest.fn()
          .mockResolvedValueOnce(null)           // first call → miss
          .mockResolvedValueOnce(cachedResult),  // second call → hit
        set: jest.fn().mockResolvedValue(undefined),
      };
      fetchSpy.mockResolvedValue(
        jsonResponse({ collection: [{ prefLabel: 'Hypertension', notation: '38341003' }] }),
      );

      const { service } = await buildService({}, cacheMock);

      const first = await service.search('SNOMED_CT', 'hypertension', 5);
      const second = await service.search('SNOMED_CT', 'hypertension', 5);

      // BioPortal only called once (cache hit on second call).
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(second).toEqual(cachedResult);
      // Cache was populated after the first fetch.
      expect(cacheMock.set).toHaveBeenCalledTimes(1);
      expect(cacheMock.set.mock.calls[0][0]).toBe('terminology:SNOMED_CT:hypertension:5');
      expect(cacheMock.set.mock.calls[0][2]).toBe(86400 * 1000); // cache-manager v7 uses ms
      // First result came from BioPortal mapping.
      expect(first.results).toEqual([
        { code: '38341003', display: 'Hypertension', system: 'SNOMED_CT' },
      ]);
    });

    it('continues gracefully when Redis cache.get throws', async () => {
      const cacheMock: CacheManagerMock = {
        get: jest.fn().mockRejectedValue(new Error('Redis connection refused')),
        set: jest.fn().mockRejectedValue(new Error('Redis connection refused')),
      };
      fetchSpy.mockResolvedValue(
        jsonResponse({ collection: [{ prefLabel: 'Asthma', notation: '195967001' }] }),
      );

      const { service } = await buildService({}, cacheMock);
      const result = await service.search('SNOMED_CT', 'asthma', 5);

      expect(result.results).toEqual([
        { code: '195967001', display: 'Asthma', system: 'SNOMED_CT' },
      ]);
    });
  });

  // ---- unknown system → 400 --------------------------------------------------

  describe('unknown system validation', () => {
    it('throws BadRequestException for an unrecognised terminology system', async () => {
      const { service } = await buildService();
      await expect(service.search('UNKNOWN_SYS', 'test', 5)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ---- BioPortal proxy -------------------------------------------------------

  describe('BioPortal proxy', () => {
    it('maps a successful BioPortal response into TerminologyResult shape', async () => {
      const { service } = await buildService();
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          collection: [
            {
              '@id': 'http://purl.bioontology.org/ontology/SNOMEDCT/44054006',
              prefLabel: 'Diabetes mellitus type 2',
              notation: '44054006',
            },
            {
              '@id': 'http://purl.bioontology.org/ontology/SNOMEDCT/73211009',
              prefLabel: 'Diabetes mellitus',
            },
          ],
        }),
      );

      const result = await service.search('SNOMED_CT', 'diabetes', 10);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = String(fetchSpy.mock.calls[0][0]);
      expect(calledUrl).toContain('ontologies=SNOMEDCT');
      expect(calledUrl).toContain('q=diabetes');
      expect(calledUrl).toContain('pagesize=10');
      expect(calledUrl).toContain('apikey=test-api-key');
      expect(result.results).toEqual([
        { code: '44054006', display: 'Diabetes mellitus type 2', system: 'SNOMED_CT' },
        { code: '73211009', display: 'Diabetes mellitus', system: 'SNOMED_CT' },
      ]);
    });

    it('extracts the code from the @id IRI when notation is missing', async () => {
      const { service } = await buildService();
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          collection: [
            {
              '@id': 'http://purl.bioontology.org/ontology/RXNORM/6809',
              prefLabel: 'Metformin',
            },
          ],
        }),
      );

      const result = await service.search('RXNORM', 'metformin', 5);
      expect(result.results).toEqual([
        { code: '6809', display: 'Metformin', system: 'RXNORM' },
      ]);
    });

    it('falls back to stub results when BioPortal returns a non-2xx response', async () => {
      const { service } = await buildService({ apiKey: 'some-key' });
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500));

      // Should not throw; falls back to stubs.
      const result = await service.search('SNOMED_CT', 'diabetes', 5);
      expect(result.results.length).toBeGreaterThan(0);
      for (const entry of result.results) {
        expect(entry.system).toBe('SNOMED_CT');
      }
    });

    it('falls back to stub results when fetch itself rejects (e.g. timeout)', async () => {
      const { service } = await buildService({ apiKey: 'some-key' });
      fetchSpy.mockRejectedValueOnce(new Error('aborted'));

      const result = await service.search('SNOMED_CT', 'diabetes', 5);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('returns empty results when the query string is blank', async () => {
      const { service } = await buildService();
      const result = await service.search('SNOMED_CT', '   ', 10);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(0);
    });

    it('uses ICD10CM as the BioPortal ontology acronym for ICD10 system', async () => {
      const { service } = await buildService();
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ collection: [{ prefLabel: 'Asthma', notation: 'J45' }] }),
      );

      await service.search('ICD10', 'asthma', 5);
      const calledUrl = String(fetchSpy.mock.calls[0][0]);
      expect(calledUrl).toContain('ontologies=ICD10CM');
    });
  });
});
