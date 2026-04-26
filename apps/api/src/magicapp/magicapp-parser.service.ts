import { Injectable, BadRequestException } from '@nestjs/common';

// ── Types ──────────────────────────────────────────────────────────────────

export interface MagicAppReference {
  title?: string;
  doi?: string;
  year?: number;
}

export interface MagicAppRecommendation {
  id?: string;
  text?: string;
  strength?: 'STRONG_FOR' | 'WEAK_FOR' | 'STRONG_AGAINST' | 'WEAK_AGAINST' | 'BEST_PRACTICE';
  certainty?: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  rationale?: string;
  references?: MagicAppReference[];
}

export interface MagicAppSubsection {
  id?: string;
  title?: string;
  content?: string;
  recommendations?: MagicAppRecommendation[];
}

export interface MagicAppSection {
  id?: string;
  title?: string;
  content?: string;
  subsections?: MagicAppSubsection[];
}

export interface MagicAppExport {
  version?: string;
  title?: string;
  description?: string;
  sections?: MagicAppSection[];
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class MagicAppParserService {
  /**
   * Parse a MagicApp JSON export string into a typed MagicAppExport object.
   *
   * Throws BadRequestException when:
   *  - The string cannot be parsed as JSON
   *  - The top-level structure does not contain a `sections` array
   */
  parse(raw: string): MagicAppExport {
    if (!raw || raw.trim().length === 0) {
      throw new BadRequestException('Empty input');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Invalid JSON: could not parse MagicApp export file');
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new BadRequestException('Invalid MagicApp format: root must be a JSON object');
    }

    const data = parsed as Record<string, unknown>;

    if (!('sections' in data) || !Array.isArray(data['sections'])) {
      throw new BadRequestException(
        'Invalid MagicApp format: missing or invalid "sections" array',
      );
    }

    return data as unknown as MagicAppExport;
  }
}
