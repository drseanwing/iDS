import { ReferenceCitationProjection } from './reference-to-citation';

describe('ReferenceCitationProjection', () => {
  let projection: ReferenceCitationProjection;

  beforeEach(() => {
    projection = new ReferenceCitationProjection();
  });

  // ── Fixtures ─────────────────────────────────────────────────────────────

  const baseReference = {
    id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    title: 'Effectiveness of oseltamivir in adults: a meta-analysis',
    abstract: 'Background: Oseltamivir is widely used for influenza treatment...',
    authors: 'Jefferson T, Jones M, Doshi P, et al.',
    year: 2014,
    doi: '10.1002/14651858.CD008965.pub4',
    pubmedId: '25271724',
    url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD008965',
    studyType: 'SYSTEMATIC_REVIEW',
    updatedAt: new Date('2023-09-10T14:00:00.000Z'),
    isDeleted: false,
  };

  // ── resourceType ─────────────────────────────────────────────────────────

  it('should produce resourceType Citation', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.resourceType).toBe('Citation');
  });

  it('should carry the reference id', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.id).toBe(baseReference.id);
  });

  // ── meta.profile ─────────────────────────────────────────────────────────

  it('should include the Citation profile URL', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.meta.profile).toContain(
      'http://hl7.org/fhir/StructureDefinition/Citation',
    );
  });

  // ── status ───────────────────────────────────────────────────────────────

  it('should always set status to active', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.status).toBe('active');
  });

  // ── top-level title / date ────────────────────────────────────────────────

  it('should map reference title to top-level title', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.title).toBe(baseReference.title);
  });

  it('should convert updatedAt Date to ISO string', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.date).toBe('2023-09-10T14:00:00.000Z');
  });

  // ── citedArtifact.title ──────────────────────────────────────────────────

  it('should map reference title into citedArtifact.title array', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.citedArtifact.title).toEqual([{ text: baseReference.title }]);
  });

  // ── citedArtifact.abstract ───────────────────────────────────────────────

  it('should include abstract in citedArtifact when present', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.citedArtifact.abstract).toEqual([{ text: baseReference.abstract }]);
  });

  it('should omit abstract from citedArtifact when null', () => {
    const result: any = projection.toCitation({ ...baseReference, abstract: null });
    expect(result.citedArtifact.abstract).toBeUndefined();
  });

  // ── citedArtifact.publicationForm ────────────────────────────────────────

  it('should include publicationForm when year is present', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.citedArtifact.publicationForm).toHaveLength(1);
    expect(result.citedArtifact.publicationForm[0].articleDate).toBe('2014');
  });

  it('should set publicationForm publishedIn type to Periodical (D020547)', () => {
    const result: any = projection.toCitation(baseReference);
    const pf = result.citedArtifact.publicationForm[0];
    expect(pf.publishedIn.type.coding[0].code).toBe('D020547');
    expect(pf.publishedIn.type.coding[0].display).toBe('Periodical');
  });

  it('should omit publicationForm when year is null', () => {
    const result: any = projection.toCitation({ ...baseReference, year: null });
    expect(result.citedArtifact.publicationForm).toBeUndefined();
  });

  // ── citedArtifact.webLocation ────────────────────────────────────────────

  it('should include DOI web location with doi-based classifier', () => {
    const result: any = projection.toCitation(baseReference);
    const doiLoc = result.citedArtifact.webLocation.find(
      (wl: any) => wl.classifier?.[0]?.coding?.[0]?.code === 'doi-based',
    );
    expect(doiLoc).toBeDefined();
    expect(doiLoc.url).toBe('https://doi.org/10.1002/14651858.CD008965.pub4');
  });

  it('should use DOI as-is when it already starts with http', () => {
    const result: any = projection.toCitation({
      ...baseReference,
      doi: 'https://doi.org/10.1002/existing',
    });
    const doiLoc = result.citedArtifact.webLocation.find(
      (wl: any) => wl.classifier?.[0]?.coding?.[0]?.code === 'doi-based',
    );
    expect(doiLoc.url).toBe('https://doi.org/10.1002/existing');
  });

  it('should include PubMed web location with pubmed classifier', () => {
    const result: any = projection.toCitation(baseReference);
    const pubmedLoc = result.citedArtifact.webLocation.find(
      (wl: any) => wl.classifier?.[0]?.coding?.[0]?.code === 'pubmed',
    );
    expect(pubmedLoc).toBeDefined();
    expect(pubmedLoc.url).toBe('https://pubmed.ncbi.nlm.nih.gov/25271724/');
  });

  it('should include generic URL web location without classifier', () => {
    const result: any = projection.toCitation(baseReference);
    const urlLoc = result.citedArtifact.webLocation.find(
      (wl: any) => !wl.classifier,
    );
    expect(urlLoc).toBeDefined();
    expect(urlLoc.url).toBe(baseReference.url);
  });

  it('should omit webLocation when all location fields are null', () => {
    const result: any = projection.toCitation({
      ...baseReference,
      doi: null,
      pubmedId: null,
      url: null,
    });
    expect(result.citedArtifact.webLocation).toBeUndefined();
  });

  it('should include only present web locations', () => {
    const result: any = projection.toCitation({
      ...baseReference,
      doi: null,
      url: null,
    });
    // Only pubmedId present
    expect(result.citedArtifact.webLocation).toHaveLength(1);
    expect(result.citedArtifact.webLocation[0].classifier[0].coding[0].code).toBe('pubmed');
  });

  // ── citedArtifact.contributorship ────────────────────────────────────────

  it('should include contributorship summary when authors are present', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.citedArtifact.contributorship.summary).toEqual([
      { value: baseReference.authors },
    ]);
  });

  it('should omit contributorship when authors is null', () => {
    const result: any = projection.toCitation({ ...baseReference, authors: null });
    expect(result.citedArtifact.contributorship).toBeUndefined();
  });

  // ── citedArtifact.classification (studyType) ──────────────────────────────

  it('should include classification when studyType is not OTHER', () => {
    const result: any = projection.toCitation(baseReference);
    expect(result.citedArtifact.classification).toHaveLength(1);
    expect(result.citedArtifact.classification[0].type.coding[0].code).toBe('SYSTEMATIC_REVIEW');
    expect(result.citedArtifact.classification[0].type.coding[0].system).toBe(
      'urn:opengrade:study-type',
    );
  });

  it('should omit classification when studyType is OTHER', () => {
    const result: any = projection.toCitation({ ...baseReference, studyType: 'OTHER' });
    expect(result.citedArtifact.classification).toBeUndefined();
  });

  it('should omit classification when studyType is null', () => {
    const result: any = projection.toCitation({ ...baseReference, studyType: null });
    expect(result.citedArtifact.classification).toBeUndefined();
  });
});
