import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReferencesService, PubmedResult } from './references.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

// ---------------------------------------------------------------------------
// Helpers to build mock fetch responses
// ---------------------------------------------------------------------------

function mockJsonResponse(body: unknown): Response {
  return {
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
    ok: true,
  } as unknown as Response;
}

function mockTextResponse(text: string): Response {
  return {
    text: () => Promise.resolve(text),
    json: () => Promise.reject(new Error('not json')),
    ok: true,
  } as unknown as Response;
}

function makeSummaryPayload(pmid: string, overrides: Record<string, unknown> = {}) {
  return {
    result: {
      [pmid]: {
        title: 'Test Article Title',
        authors: [
          { name: 'Smith JA' },
          { name: 'Doe B' },
        ],
        pubdate: '2022 Mar 15',
        elocationid: 'doi: 10.1000/xyz123',
        source: 'Test Journal',
        ...overrides,
      },
    },
  };
}

const ABSTRACT_XML = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <Article>
        <Abstract>
          <AbstractText Label="BACKGROUND">Background text here.</AbstractText>
          <AbstractText Label="CONCLUSIONS">Conclusion text here.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReferencesService.pubmedLookup', () => {
  let service: ReferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferencesService,
        { provide: PrismaService, useValue: {} },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();

    service = module.get<ReferencesService>(ReferencesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Valid PMID returns a populated PubmedResult
  // -------------------------------------------------------------------------
  it('should return a populated PubmedResult for a valid PMID', async () => {
    const pmid = '12345678';

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(makeSummaryPayload(pmid)) as any)
      .mockResolvedValueOnce(mockTextResponse(ABSTRACT_XML) as any);

    const result: PubmedResult = await service.pubmedLookup(pmid);

    expect(result.pubmedId).toBe(pmid);
    expect(result.title).toBe('Test Article Title');
    expect(result.authors).toBe('Smith JA, Doe B');
    expect(result.year).toBe(2022);
    expect(result.doi).toBe('10.1000/xyz123');
    expect(result.abstract).toBe('Background text here.\n\nConclusion text here.');
    expect(result.studyType).toBe('OTHER');
  });

  // -------------------------------------------------------------------------
  // 2. PMID not found (ESummary returns empty / error) → NotFoundException
  // -------------------------------------------------------------------------
  it('should throw NotFoundException when the PMID is not found in ESummary', async () => {
    const pmid = '99999999';

    // ESummary returns a result object that has no entry for the requested PMID
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockJsonResponse({ result: {} }) as any,
    );

    await expect(service.pubmedLookup(pmid)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when the ESummary entry has an error field', async () => {
    const pmid = '99999999';

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockJsonResponse({ result: { [pmid]: { error: 'cannot get document summary' } } }) as any,
    );

    await expect(service.pubmedLookup(pmid)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when fetch itself throws (network error)', async () => {
    const pmid = '99999999';

    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'));

    await expect(service.pubmedLookup(pmid)).rejects.toThrow(NotFoundException);
  });

  // -------------------------------------------------------------------------
  // 3. Abstract fetch failure → result still returned with abstract = null
  // -------------------------------------------------------------------------
  it('should return result with abstract=null when EFetch throws', async () => {
    const pmid = '12345678';

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(makeSummaryPayload(pmid)) as any)
      .mockRejectedValueOnce(new Error('EFetch network error'));

    const result: PubmedResult = await service.pubmedLookup(pmid);

    expect(result.pubmedId).toBe(pmid);
    expect(result.title).toBe('Test Article Title');
    expect(result.abstract).toBeNull();
  });

  it('should return result with abstract=null when AbstractText is absent from XML', async () => {
    const pmid = '12345678';
    const xmlNoAbstract = '<PubmedArticleSet><PubmedArticle></PubmedArticle></PubmedArticleSet>';

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(makeSummaryPayload(pmid)) as any)
      .mockResolvedValueOnce(mockTextResponse(xmlNoAbstract) as any);

    const result: PubmedResult = await service.pubmedLookup(pmid);

    expect(result.abstract).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 4. Authors joined correctly
  // -------------------------------------------------------------------------
  it('should join multiple authors with ", "', async () => {
    const pmid = '11111111';
    const payload = makeSummaryPayload(pmid, {
      authors: [
        { name: 'Johnson AA' },
        { name: 'Williams BC' },
        { name: 'Brown CD' },
      ],
    });

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(payload) as any)
      .mockResolvedValueOnce(mockTextResponse('') as any);

    const result: PubmedResult = await service.pubmedLookup(pmid);

    expect(result.authors).toBe('Johnson AA, Williams BC, Brown CD');
  });

  it('should return empty string for authors when authors array is missing', async () => {
    const pmid = '22222222';
    const payload = makeSummaryPayload(pmid, { authors: undefined });

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(payload) as any)
      .mockResolvedValueOnce(mockTextResponse('') as any);

    const result: PubmedResult = await service.pubmedLookup(pmid);

    expect(result.authors).toBe('');
  });

  // -------------------------------------------------------------------------
  // 5. Year and DOI edge cases
  // -------------------------------------------------------------------------
  it('should parse year from pubdate string', async () => {
    const pmid = '33333333';

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(makeSummaryPayload(pmid, { pubdate: '2019 Dec' })) as any)
      .mockResolvedValueOnce(mockTextResponse('') as any);

    const result: PubmedResult = await service.pubmedLookup(pmid);
    expect(result.year).toBe(2019);
  });

  it('should return year=null when pubdate has no 4-digit year', async () => {
    const pmid = '44444444';

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(makeSummaryPayload(pmid, { pubdate: '' })) as any)
      .mockResolvedValueOnce(mockTextResponse('') as any);

    const result: PubmedResult = await service.pubmedLookup(pmid);
    expect(result.year).toBeNull();
  });

  it('should return doi=null when elocationid has no doi prefix', async () => {
    const pmid = '55555555';

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(makeSummaryPayload(pmid, { elocationid: 'pii: S0140-6736(22)00001-0' })) as any)
      .mockResolvedValueOnce(mockTextResponse('') as any);

    const result: PubmedResult = await service.pubmedLookup(pmid);
    expect(result.doi).toBeNull();
  });

  it('should always set studyType to OTHER', async () => {
    const pmid = '66666666';

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(makeSummaryPayload(pmid)) as any)
      .mockResolvedValueOnce(mockTextResponse('') as any);

    const result: PubmedResult = await service.pubmedLookup(pmid);
    expect(result.studyType).toBe('OTHER');
  });
});
