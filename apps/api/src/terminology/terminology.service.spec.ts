import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { TerminologyService } from './terminology.service';

interface ConfigOverrides {
  apiKey?: string;
  baseUrl?: string;
  cacheTtlMs?: number;
  cacheMaxEntries?: number;
}

async function buildService(overrides: ConfigOverrides = {}): Promise<TerminologyService> {
  const map: Record<string, unknown> = {
    'terminology.bioportalApiKey': overrides.apiKey ?? 'test-api-key',
    'terminology.bioportalBaseUrl': overrides.baseUrl ?? 'https://data.bioontology.org',
    'terminology.cacheTtlMs': overrides.cacheTtlMs ?? 60_000,
    'terminology.cacheMaxEntries': overrides.cacheMaxEntries ?? 1000,
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      TerminologyService,
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) => map[key],
        },
      },
    ],
  }).compile();

  return moduleRef.get(TerminologyService);
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('TerminologyService', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps a successful BioPortal response into TerminologyResult shape', async () => {
    const service = await buildService();
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

  it('returns the cached value on a second identical call without re-fetching', async () => {
    const service = await buildService();
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        collection: [{ prefLabel: 'Hypertension', notation: '38341003' }],
      }),
    );

    const first = await service.search('SNOMED_CT', 'hypertension', 5);
    const second = await service.search('SNOMED_CT', 'hypertension', 5);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('re-fetches after the cache TTL has expired', async () => {
    const service = await buildService({ cacheTtlMs: 1000 });
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({ collection: [{ prefLabel: 'Asthma', notation: 'J45' }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ collection: [{ prefLabel: 'Asthma', notation: 'J45' }] }),
      );

    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      await service.search('ICD10', 'asthma', 5);
      // Advance past TTL.
      now += 2000;
      await service.search('ICD10', 'asthma', 5);
    } finally {
      Date.now = realNow;
    }

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('falls back to the stub dataset when BIOPORTAL_API_KEY is unset', async () => {
    const service = await buildService({ apiKey: '' });
    const result = await service.search('SNOMED_CT', 'diabetes', 5);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.results.length).toBeGreaterThan(0);
    for (const entry of result.results) {
      expect(entry.system).toBe('SNOMED_CT');
      expect(entry.display.toLowerCase()).toContain('diabetes');
    }
  });

  it('throws ServiceUnavailableException on a non-2xx BioPortal response', async () => {
    const service = await buildService();
    fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500));

    await expect(service.search('SNOMED_CT', 'diabetes', 5)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws ServiceUnavailableException when fetch itself rejects (e.g. timeout)', async () => {
    const service = await buildService();
    fetchSpy.mockRejectedValueOnce(new Error('aborted'));

    await expect(service.search('SNOMED_CT', 'diabetes', 5)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('evicts the oldest entry when the LRU cap is exceeded', async () => {
    const service = await buildService({ cacheMaxEntries: 2 });

    // Three distinct cache keys → first one should be evicted.
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ collection: [{ prefLabel: 'A', notation: '1' }] }))
      .mockResolvedValueOnce(jsonResponse({ collection: [{ prefLabel: 'B', notation: '2' }] }))
      .mockResolvedValueOnce(jsonResponse({ collection: [{ prefLabel: 'C', notation: '3' }] }));

    await service.search('SNOMED_CT', 'a', 5);
    await service.search('SNOMED_CT', 'b', 5);
    await service.search('SNOMED_CT', 'c', 5);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // 'a' should have been evicted → re-querying triggers another fetch.
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ collection: [{ prefLabel: 'A', notation: '1' }] }),
    );
    await service.search('SNOMED_CT', 'a', 5);
    expect(fetchSpy).toHaveBeenCalledTimes(4);

    // 'c' is still cached → no extra fetch.
    await service.search('SNOMED_CT', 'c', 5);
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it('extracts the code from the @id IRI when notation is missing', async () => {
    const service = await buildService();
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
});
