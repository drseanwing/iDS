import { Injectable } from '@nestjs/common';

export interface RisEntry {
  title: string | null;
  authors: string | null; // joined: "Author A, Author B"
  year: number | null;
  abstract: string | null;
  doi: string | null;
  url: string | null;
}

@Injectable()
export class RisParserService {
  parse(content: string): RisEntry[] {
    // Normalise line endings
    const normalised = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split into individual records on "ER  - " (end-of-record marker).
    // We split on the newline that precedes the ER line so each chunk
    // contains only the lines that belong to that record.
    const rawRecords = normalised.split(/\nER  - .*?(?:\n|$)/);

    const entries: RisEntry[] = [];

    for (const rawRecord of rawRecords) {
      const lines = rawRecord.split('\n');

      let title: string | null = null;
      const authorsList: string[] = [];
      let year: number | null = null;
      let abstract: string | null = null;
      let doi: string | null = null;
      let url: string | null = null;

      for (const line of lines) {
        // RIS tag format: exactly 2 chars + "  - " + value
        const match = line.match(/^([A-Z][A-Z0-9])  - (.*)$/);
        if (!match) continue;

        const tag = match[1];
        const value = match[2].trim();

        switch (tag) {
          case 'TI':
          case 'T1':
            if (title === null) title = value;
            break;
          case 'AU':
            if (value) authorsList.push(value);
            break;
          case 'PY':
          case 'Y1': {
            if (year === null) {
              // Year may be "2023" or "2023/01/15/..." — take first 4 digits
              const yearMatch = value.match(/(\d{4})/);
              if (yearMatch) year = parseInt(yearMatch[1], 10);
            }
            break;
          }
          case 'AB':
          case 'N2':
            if (abstract === null) abstract = value;
            break;
          case 'DO':
            if (doi === null && value) doi = value;
            break;
          case 'UR':
            if (url === null && value) url = value;
            break;
          default:
            break;
        }
      }

      // Only include entries that have at least a title
      if (!title) continue;

      entries.push({
        title,
        authors: authorsList.length > 0 ? authorsList.join(', ') : null,
        year,
        abstract,
        doi,
        url,
      });
    }

    return entries;
  }
}
