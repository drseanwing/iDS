import { RisParserService } from './ris-parser.service';

describe('RisParserService', () => {
  let service: RisParserService;

  beforeEach(() => {
    service = new RisParserService();
  });

  it('parses a minimal RIS record (TY + TI + AU + PY + ER)', () => {
    const content = [
      'TY  - JOUR',
      'TI  - A Minimal Title',
      'AU  - Smith, John',
      'PY  - 2023',
      'ER  - ',
    ].join('\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('A Minimal Title');
    expect(entries[0].authors).toBe('Smith, John');
    expect(entries[0].year).toBe(2023);
    expect(entries[0].abstract).toBeNull();
    expect(entries[0].doi).toBeNull();
    expect(entries[0].url).toBeNull();
  });

  it('parses multiple records from one file', () => {
    const content = [
      'TY  - JOUR',
      'TI  - First Article',
      'AU  - Doe, Jane',
      'PY  - 2021',
      'ER  - ',
      'TY  - BOOK',
      'TI  - Second Book',
      'AU  - Brown, Alice',
      'PY  - 2020',
      'ER  - ',
    ].join('\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(2);
    expect(entries[0].title).toBe('First Article');
    expect(entries[1].title).toBe('Second Book');
  });

  it('joins multiple AU lines with ", "', () => {
    const content = [
      'TY  - JOUR',
      'TI  - Multi-author Study',
      'AU  - Smith, John',
      'AU  - Jones, Mary',
      'AU  - Lee, Bob',
      'ER  - ',
    ].join('\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].authors).toBe('Smith, John, Jones, Mary, Lee, Bob');
  });

  it('skips records with no title', () => {
    const content = [
      'TY  - JOUR',
      'AU  - Nameless, Author',
      'PY  - 2022',
      'ER  - ',
      'TY  - BOOK',
      'TI  - Has a Title',
      'ER  - ',
    ].join('\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Has a Title');
  });

  it('handles Windows \\r\\n line endings', () => {
    const content = [
      'TY  - JOUR',
      'TI  - Windows Line Endings',
      'AU  - Test, Author',
      'PY  - 2024',
      'ER  - ',
    ].join('\r\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Windows Line Endings');
    expect(entries[0].authors).toBe('Test, Author');
    expect(entries[0].year).toBe(2024);
  });

  it('extracts DOI from DO tag', () => {
    const content = [
      'TY  - JOUR',
      'TI  - DOI Article',
      'AU  - Author, One',
      'PY  - 2019',
      'DO  - 10.1000/xyz123',
      'ER  - ',
    ].join('\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].doi).toBe('10.1000/xyz123');
  });

  it('accepts T1 as an alternative title tag', () => {
    const content = [
      'TY  - JOUR',
      'T1  - T1 Title',
      'AU  - Author, Two',
      'ER  - ',
    ].join('\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('T1 Title');
  });

  it('accepts N2 as an alternative abstract tag', () => {
    const content = [
      'TY  - JOUR',
      'TI  - Abstract Test',
      'N2  - This is the abstract text.',
      'ER  - ',
    ].join('\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].abstract).toBe('This is the abstract text.');
  });

  it('accepts Y1 as an alternative year tag', () => {
    const content = [
      'TY  - JOUR',
      'TI  - Year Test',
      'Y1  - 2018/03/15/',
      'ER  - ',
    ].join('\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].year).toBe(2018);
  });

  it('extracts URL from UR tag', () => {
    const content = [
      'TY  - JOUR',
      'TI  - URL Article',
      'UR  - https://example.com/article',
      'ER  - ',
    ].join('\n');

    const entries = service.parse(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe('https://example.com/article');
  });

  it('returns empty array when content has no valid records', () => {
    const entries = service.parse('');
    expect(entries).toHaveLength(0);
  });
});
