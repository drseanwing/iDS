import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// TODO: For multi-replica deployments, swap the in-process LRU below for a
// shared Redis cache so all replicas benefit from the same warm entries and
// avoid duplicating BioPortal calls. The public API surface (search method,
// TerminologyResult / TerminologySearchResult shapes) should not need to change.

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
  ICD10: 'ICD10',
  ATC: 'ATC',
  RXNORM: 'RXNORM',
};

interface BioPortalCollectionItem {
  '@id'?: string;
  prefLabel?: string;
  notation?: string;
  cui?: string | string[];
}

interface BioPortalSearchResponse {
  collection?: BioPortalCollectionItem[];
}

interface CacheEntry {
  value: TerminologySearchResult;
  expiresAt: number;
}

const REQUEST_TIMEOUT_MS = 5000;

@Injectable()
export class TerminologyService implements OnModuleInit {
  private readonly logger = new Logger(TerminologyService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheTtlMs: number;
  private readonly cacheMaxEntries: number;
  // NOTE: This is a single-process LRU cache; swap to Redis for multi-replica deployments.
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('terminology.bioportalApiKey') ?? '';
    this.baseUrl =
      this.configService.get<string>('terminology.bioportalBaseUrl') ??
      'https://data.bioontology.org';
    this.cacheTtlMs = this.configService.get<number>('terminology.cacheTtlMs') ?? 86_400_000;
    this.cacheMaxEntries =
      this.configService.get<number>('terminology.cacheMaxEntries') ?? 1000;
  }

  onModuleInit(): void {
    if (!this.apiKey) {
      this.logger.warn(
        'BIOPORTAL_API_KEY is not set; TerminologyService will fall back to the in-memory stub dataset. Set BIOPORTAL_API_KEY in production.',
      );
    }
  }

  /**
   * Search terminology codes by system + query. Returns up to `limit` results.
   *
   * - When BIOPORTAL_API_KEY is set, proxies to BioPortal and caches the
   *   mapped result in an in-process LRU.
   * - When the key is unset, falls back to the bundled STUB_CODES dataset
   *   (preserves the dev-offline experience).
   * - Non-2xx responses from BioPortal are surfaced as
   *   ServiceUnavailableException so the controller can return a 503.
   */
  async search(system: string, query: string, limit = 20): Promise<TerminologySearchResult> {
    const normalizedQuery = (query ?? '').trim();
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;

    // No API key → preserve dev-offline behaviour by serving the stub dataset.
    if (!this.apiKey) {
      return this.searchStub(system, normalizedQuery, safeLimit);
    }

    if (!normalizedQuery) {
      return { results: [] };
    }

    const cacheKey = this.buildCacheKey(system, normalizedQuery, safeLimit);
    const cached = this.readCache(cacheKey);
    if (cached) {
      return cached;
    }

    const acronym = BIOPORTAL_ACRONYMS[system];
    if (!acronym) {
      // Unknown system → empty result (keeps controller responses consistent).
      return { results: [] };
    }

    const result = await this.fetchFromBioPortal(system, acronym, normalizedQuery, safeLimit);
    this.writeCache(cacheKey, result);
    return result;
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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`BioPortal request failed for ${system}/${query}: ${message}`);
      // Throw 503 so callers get a clear retryable signal rather than a silent empty list.
      throw new ServiceUnavailableException('Terminology service is unavailable');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      this.logger.error(
        `BioPortal responded with HTTP ${response.status} for ${system}/${query}`,
      );
      throw new ServiceUnavailableException('Terminology service is unavailable');
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

  // ---- LRU cache ------------------------------------------------------------

  private buildCacheKey(system: string, query: string, limit: number): string {
    return `${system}|${query.toLowerCase()}|${limit}`;
  }

  private readCache(key: string): TerminologySearchResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    // Refresh recency: re-insert so this key becomes the most-recently-used.
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  private writeCache(key: string, value: TerminologySearchResult): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
    while (this.cache.size > this.cacheMaxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey === undefined) break;
      this.cache.delete(oldestKey);
    }
  }
}
