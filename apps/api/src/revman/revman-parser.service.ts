import { Injectable, BadRequestException } from '@nestjs/common';

// ── Types ─────────────────────────────────────────────────────────────────

export interface RevManStudy {
  id: string;
  eventsIntervention?: number;
  totalIntervention?: number;
  eventsControl?: number;
  totalControl?: number;
  meanIntervention?: number;
  meanControl?: number;
}

export interface RevManOverallEffect {
  effect?: number;
  ciLower?: number;
  ciUpper?: number;
  totalStudies?: number;
  totalParticipants?: number;
}

export interface RevManOutcome {
  name: string;
  type: 'DICHOTOMOUS' | 'CONTINUOUS';
  studies: RevManStudy[];
  overallEffect?: RevManOverallEffect;
}

export interface RevManComparison {
  name: string;
  outcomes: RevManOutcome[];
}

export interface RevManData {
  title: string;
  comparisons: RevManComparison[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract the text content of the first occurrence of a tag in a string.
 * Returns undefined when the tag is absent.
 */
function extractTagContent(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : undefined;
}

/**
 * Extract attribute value from an opening tag.
 */
function extractAttr(tag: string, attr: string): string | undefined {
  const re = new RegExp(`${attr}="([^"]*)"`, 'i');
  const m = tag.match(re);
  return m ? m[1] : undefined;
}

/**
 * Split XML into top-level element chunks for a given tag name.
 * Works for non-nested occurrences (RevMan COMPARISON elements are siblings).
 */
function splitByTag(xml: string, tag: string): string[] {
  const chunks: string[] = [];
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
  const closeTag = `</${tag}>`;
  let match: RegExpExecArray | null;

  while ((match = openRe.exec(xml)) !== null) {
    const start = match.index;
    const closeIdx = xml.indexOf(closeTag, start + match[0].length);
    if (closeIdx === -1) break;
    chunks.push(xml.slice(start, closeIdx + closeTag.length));
  }
  return chunks;
}

/**
 * Parse a float attribute, returning undefined for non-numeric / absent values.
 */
function parseFloatAttr(openTag: string, attr: string): number | undefined {
  const raw = extractAttr(openTag, attr);
  if (raw === undefined || raw === '') return undefined;
  const n = parseFloat(raw);
  return isNaN(n) ? undefined : n;
}

/**
 * Parse an integer attribute, returning undefined for non-numeric / absent values.
 */
function parseIntAttr(openTag: string, attr: string): number | undefined {
  const raw = extractAttr(openTag, attr);
  if (raw === undefined || raw === '') return undefined;
  const n = parseInt(raw, 10);
  return isNaN(n) ? undefined : n;
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class RevmanParserService {
  /**
   * Parse a RevMan 5 (.rm5) XML string into structured data.
   *
   * RevMan 5 structure (simplified):
   *   <COCHRANE_REVIEW TITLE="...">
   *     <ANALYSES_AND_DATA>
   *       <COMPARISON NO="1" NAME="...">
   *         <DICH_DATA NO="1" NAME="...">
   *           <DICH_SUBDATA> ... </DICH_SUBDATA>
   *           <DICH_STUDY STUDY_ID="..." ...>
   *             <DICH_DATA_ENTRY EVENTS_1="..." TOTAL_1="..." EVENTS_2="..." TOTAL_2="..." />
   *           </DICH_STUDY>
   *         </DICH_DATA>
   *         <CONT_DATA NO="2" NAME="...">
   *           <CONT_STUDY STUDY_ID="..." ...>
   *             <CONT_DATA_ENTRY MEAN_1="..." MEAN_2="..." TOTAL_1="..." TOTAL_2="..." />
   *           </CONT_STUDY>
   *         </CONT_DATA>
   *       </COMPARISON>
   *     </ANALYSES_AND_DATA>
   *   </COCHRANE_REVIEW>
   */
  parseRevManXml(xml: string): RevManData {
    if (!xml || xml.trim().length === 0) {
      throw new BadRequestException('Empty XML input');
    }

    // Basic sanity check
    if (!xml.includes('<') || !xml.includes('>')) {
      throw new BadRequestException('Input does not appear to be XML');
    }

    // Extract title
    const title = this.extractTitle(xml);

    // Find ANALYSES_AND_DATA section (may be absent in older files)
    const analysesSection = this.extractAnalysesSection(xml);
    const sourceXml = analysesSection ?? xml;

    // Parse comparisons
    const comparisons = this.parseComparisons(sourceXml);

    return { title, comparisons };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private extractTitle(xml: string): string {
    // Try TITLE attribute on root element first
    const rootMatch = xml.match(/<COCHRANE_REVIEW[^>]*TITLE="([^"]*)"/i);
    if (rootMatch) return rootMatch[1];

    // Fall back to <TITLE> element
    const tagContent = extractTagContent(xml, 'TITLE');
    if (tagContent) return tagContent;

    return 'Unknown Review';
  }

  private extractAnalysesSection(xml: string): string | undefined {
    return extractTagContent(xml, 'ANALYSES_AND_DATA');
  }

  private parseComparisons(xml: string): RevManComparison[] {
    const compChunks = splitByTag(xml, 'COMPARISON');
    return compChunks.map((chunk) => this.parseComparison(chunk));
  }

  private parseComparison(chunk: string): RevManComparison {
    // Extract opening tag to get NAME attribute
    const openTagMatch = chunk.match(/^<COMPARISON[^>]*>/i);
    const openTag = openTagMatch ? openTagMatch[0] : '';
    const name = extractAttr(openTag, 'NAME') ?? extractTagContent(chunk, 'NAME') ?? 'Unknown Comparison';

    const outcomes: RevManOutcome[] = [
      ...this.parseDichotomousOutcomes(chunk),
      ...this.parseContinuousOutcomes(chunk),
    ];

    return { name, outcomes };
  }

  private parseDichotomousOutcomes(compXml: string): RevManOutcome[] {
    const chunks = splitByTag(compXml, 'DICH_DATA');
    return chunks.map((chunk) => {
      const openTagMatch = chunk.match(/^<DICH_DATA[^>]*>/i);
      const openTag = openTagMatch ? openTagMatch[0] : '';
      const name = extractAttr(openTag, 'NAME') ?? extractTagContent(chunk, 'NAME') ?? 'Unknown Outcome';

      const studies = this.parseDichotomousStudies(chunk);
      const overallEffect = this.parseDichotomousOverall(chunk);

      return { name, type: 'DICHOTOMOUS' as const, studies, overallEffect };
    });
  }

  private parseDichotomousStudies(dataXml: string): RevManStudy[] {
    const studyChunks = splitByTag(dataXml, 'DICH_STUDY');
    return studyChunks.map((chunk) => {
      const openTagMatch = chunk.match(/^<DICH_STUDY[^>]*>/i);
      const openTag = openTagMatch ? openTagMatch[0] : '';
      const studyId = extractAttr(openTag, 'STUDY_ID') ?? extractAttr(openTag, 'ID') ?? 'Unknown';

      // Find data entry element
      const entryMatch = chunk.match(/<DICH_DATA_ENTRY[^>]*>/i);
      const entry = entryMatch ? entryMatch[0] : '';

      return {
        id: studyId,
        eventsIntervention: parseIntAttr(entry, 'EVENTS_1'),
        totalIntervention: parseIntAttr(entry, 'TOTAL_1'),
        eventsControl: parseIntAttr(entry, 'EVENTS_2'),
        totalControl: parseIntAttr(entry, 'TOTAL_2'),
      };
    });
  }

  private parseDichotomousOverall(dataXml: string): RevManOverallEffect | undefined {
    // Overall effect is typically in DICH_SUBDATA or as attributes on DICH_DATA
    const subMatch = dataXml.match(/<DICH_SUBDATA[^>]*>/i);
    if (!subMatch) return undefined;
    const subTag = subMatch[0];

    return {
      effect: parseFloatAttr(subTag, 'EFFECT_SIZE') ?? parseFloatAttr(subTag, 'RR'),
      ciLower: parseFloatAttr(subTag, 'CI_START') ?? parseFloatAttr(subTag, 'CI_LOWER'),
      ciUpper: parseFloatAttr(subTag, 'CI_END') ?? parseFloatAttr(subTag, 'CI_UPPER'),
      totalStudies: parseIntAttr(subTag, 'STUDIES'),
      totalParticipants: parseIntAttr(subTag, 'PARTICIPANTS'),
    };
  }

  private parseContinuousOutcomes(compXml: string): RevManOutcome[] {
    const chunks = splitByTag(compXml, 'CONT_DATA');
    return chunks.map((chunk) => {
      const openTagMatch = chunk.match(/^<CONT_DATA[^>]*>/i);
      const openTag = openTagMatch ? openTagMatch[0] : '';
      const name = extractAttr(openTag, 'NAME') ?? extractTagContent(chunk, 'NAME') ?? 'Unknown Outcome';

      const studies = this.parseContinuousStudies(chunk);
      const overallEffect = this.parseContinuousOverall(chunk);

      return { name, type: 'CONTINUOUS' as const, studies, overallEffect };
    });
  }

  private parseContinuousStudies(dataXml: string): RevManStudy[] {
    const studyChunks = splitByTag(dataXml, 'CONT_STUDY');
    return studyChunks.map((chunk) => {
      const openTagMatch = chunk.match(/^<CONT_STUDY[^>]*>/i);
      const openTag = openTagMatch ? openTagMatch[0] : '';
      const studyId = extractAttr(openTag, 'STUDY_ID') ?? extractAttr(openTag, 'ID') ?? 'Unknown';

      const entryMatch = chunk.match(/<CONT_DATA_ENTRY[^>]*>/i);
      const entry = entryMatch ? entryMatch[0] : '';

      return {
        id: studyId,
        meanIntervention: parseFloatAttr(entry, 'MEAN_1'),
        totalIntervention: parseIntAttr(entry, 'TOTAL_1'),
        meanControl: parseFloatAttr(entry, 'MEAN_2'),
        totalControl: parseIntAttr(entry, 'TOTAL_2'),
      };
    });
  }

  private parseContinuousOverall(dataXml: string): RevManOverallEffect | undefined {
    const subMatch = dataXml.match(/<CONT_SUBDATA[^>]*>/i);
    if (!subMatch) return undefined;
    const subTag = subMatch[0];

    return {
      effect: parseFloatAttr(subTag, 'EFFECT_SIZE') ?? parseFloatAttr(subTag, 'MD'),
      ciLower: parseFloatAttr(subTag, 'CI_START') ?? parseFloatAttr(subTag, 'CI_LOWER'),
      ciUpper: parseFloatAttr(subTag, 'CI_END') ?? parseFloatAttr(subTag, 'CI_UPPER'),
      totalStudies: parseIntAttr(subTag, 'STUDIES'),
      totalParticipants: parseIntAttr(subTag, 'PARTICIPANTS'),
    };
  }
}
