import { BadRequestException, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';

export interface TerminologyResult {
  code: string;
  display: string;
  system: string;
}

export interface TerminologySearchResult {
  results: TerminologyResult[];
}

const STUB_CODES: Record<string, TerminologyResult[]> = {
  SNOMED_CT: [
    { code: '44054006', display: 'Diabetes mellitus type 2', system: 'SNOMED_CT' },
    { code: '73211009', display: 'Diabetes mellitus', system: 'SNOMED_CT' },
    { code: '38341003', display: 'Hypertension', system: 'SNOMED_CT' },
    { code: '195967001', display: 'Asthma', system: 'SNOMED_CT' },
    { code: '13645005', display: 'Chronic obstructive pulmonary disease', system: 'SNOMED_CT' },
    { code: '22298006', display: 'Myocardial infarction', system: 'SNOMED_CT' },
    { code: '230690007', display: 'Stroke', system: 'SNOMED_CT' },
    { code: '49436004', display: 'Atrial fibrillation', system: 'SNOMED_CT' },
    { code: '84114007', display: 'Heart failure', system: 'SNOMED_CT' },
    { code: '254837009', display: 'Breast cancer', system: 'SNOMED_CT' },
    { code: '363346000', display: 'Cancer', system: 'SNOMED_CT' },
    { code: '56265001', display: 'Heart disease', system: 'SNOMED_CT' },
    { code: '73211009', display: 'Diabetes mellitus type 1', system: 'SNOMED_CT' },
    { code: '40930008', display: 'Hypothyroidism', system: 'SNOMED_CT' },
    { code: '34486009', display: 'Hyperthyroidism', system: 'SNOMED_CT' },
    { code: '271737000', display: 'Anaemia', system: 'SNOMED_CT' },
    { code: '77386006', display: 'Pregnancy', system: 'SNOMED_CT' },
    { code: '70995007', display: 'Pulmonary hypertension', system: 'SNOMED_CT' },
    { code: '53741008', display: 'Coronary artery disease', system: 'SNOMED_CT' },
    { code: '44054006', display: 'Type 2 diabetes mellitus', system: 'SNOMED_CT' },
  ],
  ICD10: [
    { code: 'E11', display: 'Type 2 diabetes mellitus', system: 'ICD10' },
    { code: 'E10', display: 'Type 1 diabetes mellitus', system: 'ICD10' },
    { code: 'I10', display: 'Essential (primary) hypertension', system: 'ICD10' },
    { code: 'J45', display: 'Asthma', system: 'ICD10' },
    { code: 'J44', display: 'Chronic obstructive pulmonary disease', system: 'ICD10' },
    { code: 'I21', display: 'Acute myocardial infarction', system: 'ICD10' },
    { code: 'I50', display: 'Heart failure', system: 'ICD10' },
    { code: 'I48', display: 'Atrial fibrillation and flutter', system: 'ICD10' },
    { code: 'I63', display: 'Cerebral infarction (stroke)', system: 'ICD10' },
    { code: 'C50', display: 'Malignant neoplasm of breast', system: 'ICD10' },
    { code: 'C34', display: 'Malignant neoplasm of bronchus and lung', system: 'ICD10' },
    { code: 'E78', display: 'Disorders of lipoprotein metabolism and other lipidemias', system: 'ICD10' },
    { code: 'N18', display: 'Chronic kidney disease', system: 'ICD10' },
    { code: 'F32', display: 'Depressive episode', system: 'ICD10' },
    { code: 'F41', display: 'Anxiety disorders', system: 'ICD10' },
    { code: 'M79.3', display: 'Panniculitis', system: 'ICD10' },
    { code: 'K21', display: 'Gastro-oesophageal reflux disease', system: 'ICD10' },
    { code: 'E03', display: 'Hypothyroidism', system: 'ICD10' },
    { code: 'D50', display: 'Iron deficiency anaemia', system: 'ICD10' },
    { code: 'I25', display: 'Chronic ischaemic heart disease', system: 'ICD10' },
  ],
  ATC: [
    { code: 'A10BA02', display: 'Metformin', system: 'ATC' },
    { code: 'A10BB01', display: 'Glibenclamide', system: 'ATC' },
    { code: 'A10BJ01', display: 'Exenatide', system: 'ATC' },
    { code: 'A10BK01', display: 'Dapagliflozin', system: 'ATC' },
    { code: 'C09AA01', display: 'Captopril', system: 'ATC' },
    { code: 'C09AA02', display: 'Enalapril', system: 'ATC' },
    { code: 'C09CA01', display: 'Losartan', system: 'ATC' },
    { code: 'C07AB02', display: 'Metoprolol', system: 'ATC' },
    { code: 'C08CA01', display: 'Amlodipine', system: 'ATC' },
    { code: 'C10AA01', display: 'Simvastatin', system: 'ATC' },
    { code: 'C10AA05', display: 'Atorvastatin', system: 'ATC' },
    { code: 'B01AC06', display: 'Aspirin (antiplatelet)', system: 'ATC' },
    { code: 'B01AA03', display: 'Warfarin', system: 'ATC' },
    { code: 'B01AF01', display: 'Rivaroxaban', system: 'ATC' },
    { code: 'N02BE01', display: 'Paracetamol', system: 'ATC' },
    { code: 'M01AE01', display: 'Ibuprofen', system: 'ATC' },
    { code: 'J01CA04', display: 'Amoxicillin', system: 'ATC' },
    { code: 'R03AC02', display: 'Salbutamol', system: 'ATC' },
    { code: 'R03BA02', display: 'Budesonide (inhaled)', system: 'ATC' },
    { code: 'H02AB06', display: 'Prednisolone', system: 'ATC' },
  ],
  RXNORM: [
    { code: '6809', display: 'Metformin', system: 'RXNORM' },
    { code: '41493', display: 'Glipizide', system: 'RXNORM' },
    { code: '274783', display: 'Insulin glargine', system: 'RXNORM' },
    { code: '1373458', display: 'Empagliflozin', system: 'RXNORM' },
    { code: '1372029', display: 'Dapagliflozin', system: 'RXNORM' },
    { code: '1860484', display: 'Semaglutide', system: 'RXNORM' },
    { code: '29046', display: 'Lisinopril', system: 'RXNORM' },
    { code: '83515', display: 'Losartan', system: 'RXNORM' },
    { code: '41493', display: 'Amlodipine', system: 'RXNORM' },
    { code: '36567', display: 'Simvastatin', system: 'RXNORM' },
    { code: '83367', display: 'Atorvastatin', system: 'RXNORM' },
    { code: '1191', display: 'Aspirin', system: 'RXNORM' },
    { code: '11289', display: 'Warfarin', system: 'RXNORM' },
    { code: '1114195', display: 'Rivaroxaban', system: 'RXNORM' },
    { code: '161', display: 'Acetaminophen (Paracetamol)', system: 'RXNORM' },
    { code: '5640', display: 'Ibuprofen', system: 'RXNORM' },
    { code: '723', display: 'Amoxicillin', system: 'RXNORM' },
    { code: '435', display: 'Albuterol (Salbutamol)', system: 'RXNORM' },
    { code: '1514', display: 'Budesonide', system: 'RXNORM' },
    { code: '8640', display: 'Prednisone', system: 'RXNORM' },
  ],
};

// Map our internal system identifiers to BioPortal ontology acronyms.
const BIOPORTAL_ACRONYMS: Record<string, string> = {
  SNOMED_CT: 'SNOMEDCT',
  ICD10: 'ICD10CM',
  ATC: 'ATC',
  RXNORM: 'RXNORM',
};

interface BioPortalCollectionItem {
  '@id'?: string;
  prefLabel?: string;
  notation?: string;
  definition?: string[];
}

interface BioPortalSearchResponse {
  collection?: BioPortalCollectionItem[];
}

const REQUEST_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 86400 * 1000; // 24 hours in milliseconds (cache-manager v7 uses ms)

@Injectable()
export class TerminologyService implements OnModuleInit {
  private readonly logger = new Logger(TerminologyService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.apiKey =
      this.configService.get<string>('terminology.bioportalApiKey') ?? '';
    this.baseUrl =
      this.configService.get<string>('terminology.bioportalBaseUrl') ??
      'https://data.bioontology.org';
  }

  onModuleInit(): void {
    if (!this.apiKey) {
      this.logger.warn(
        'TERMINOLOGY_BIOPORTAL_API_KEY is not set; TerminologyService will fall back to the ' +
          'in-memory stub dataset. Set TERMINOLOGY_BIOPORTAL_API_KEY in production.',
      );
    }
  }

  /**
   * Search terminology codes by system + query. Returns up to `limit` results.
   *
   * - When TERMINOLOGY_BIOPORTAL_API_KEY is set, proxies to BioPortal and caches the
   *   result in Redis (24 h TTL). Falls back to stub if BioPortal is unreachable.
   * - When the key is unset, falls back to the bundled STUB_CODES dataset
   *   (preserves the dev-offline experience).
   * - Throws BadRequestException for unknown system identifiers.
   */
  async search(system: string, query: string, limit = 20): Promise<TerminologySearchResult> {
    const normalizedQuery = (query ?? '').trim();
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;

    const acronym = BIOPORTAL_ACRONYMS[system];
    if (!acronym) {
      throw new BadRequestException(`Unknown terminology system: ${system}`);
    }

    // No API key → preserve dev-offline behaviour by serving the stub dataset.
    if (!this.apiKey) {
      return this.searchStub(system, normalizedQuery, safeLimit);
    }

    if (!normalizedQuery) {
      return { results: [] };
    }

    const cacheKey = `terminology:${system}:${normalizedQuery.toLowerCase()}:${safeLimit}`;

    // Try Redis cache first (gracefully degrade if Redis is unavailable).
    try {
      const cached = await this.cacheManager.get<TerminologySearchResult>(cacheKey);
      if (cached !== undefined && cached !== null) {
        return cached;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis cache read failed, proceeding without cache: ${message}`);
    }

    // Fetch from BioPortal (gracefully fallback to stub if API is unreachable).
    try {
      const result = await this.fetchFromBioPortal(system, acronym, normalizedQuery, safeLimit);

      // Store in Redis cache; if Redis is unavailable, log and continue.
      try {
        await this.cacheManager.set(cacheKey, result, CACHE_TTL_MS);
      } catch (cacheErr) {
        const message = cacheErr instanceof Error ? cacheErr.message : String(cacheErr);
        this.logger.warn(`Redis cache write failed: ${message}`);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`BioPortal lookup failed, falling back to stubs: ${message}`);
      return this.searchStub(system, normalizedQuery, safeLimit);
    }
  }

  // ---- BioPortal client -----------------------------------------------------

  private async fetchFromBioPortal(
    system: string,
    acronym: string,
    query: string,
    limit: number,
  ): Promise<TerminologySearchResult> {
    const url = new URL('/search', this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('ontologies', acronym);
    url.searchParams.set('pagesize', String(limit));
    url.searchParams.set('apikey', this.apiKey);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`BioPortal returned ${response.status}`);
    }

    const body = (await response.json()) as BioPortalSearchResponse;
    const collection = Array.isArray(body?.collection) ? body.collection : [];

    const results: TerminologyResult[] = collection
      .map((item) => this.mapBioPortalItem(item, system))
      .filter((entry): entry is TerminologyResult => entry !== null)
      .slice(0, limit);

    return { results };
  }

  private mapBioPortalItem(
    item: BioPortalCollectionItem,
    system: string,
  ): TerminologyResult | null {
    const display = item?.prefLabel?.trim();
    const code = item?.notation?.trim() || this.extractCodeFromIri(item?.['@id']);
    if (!display || !code) {
      return null;
    }
    return { code, display, system };
  }

  private extractCodeFromIri(iri?: string): string {
    if (!iri) return '';
    // BioPortal IRIs end with the local code, separated by '/' or '#'.
    const hashIndex = iri.lastIndexOf('#');
    if (hashIndex >= 0 && hashIndex < iri.length - 1) {
      return iri.slice(hashIndex + 1);
    }
    const slashIndex = iri.lastIndexOf('/');
    if (slashIndex >= 0 && slashIndex < iri.length - 1) {
      return iri.slice(slashIndex + 1);
    }
    return iri;
  }

  // ---- Stub fallback --------------------------------------------------------

  getStubResults(system: string, query: string, limit: number): TerminologySearchResult {
    return this.searchStub(system, query, limit);
  }

  private searchStub(
    system: string,
    query: string,
    limit: number,
  ): TerminologySearchResult {
    const candidates = STUB_CODES[system] ?? [];
    const q = query.toLowerCase();
    const results = candidates
      .filter((entry) => entry.display.toLowerCase().includes(q) || entry.code.includes(q))
      .slice(0, limit);
    return { results };
  }
}
