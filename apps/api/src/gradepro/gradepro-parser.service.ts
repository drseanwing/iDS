import { Injectable, BadRequestException } from '@nestjs/common';

// ── Types ──────────────────────────────────────────────────────────────────

export interface GradeProOutcome {
  id?: string;
  name?: string;
  type?: 'CRITICAL' | 'IMPORTANT' | 'NOT_IMPORTANT';
  riskOfBias?: 'NO_LIMITATION' | 'SERIOUS' | 'VERY_SERIOUS';
  inconsistency?: 'NO_SERIOUS' | 'SERIOUS' | 'VERY_SERIOUS';
  indirectness?: 'NO_SERIOUS' | 'SERIOUS' | 'VERY_SERIOUS';
  imprecision?: 'NO_SERIOUS' | 'SERIOUS' | 'VERY_SERIOUS';
  publicationBias?: 'NO_SUSPECTED' | 'SUSPECTED' | 'STRONGLY_SUSPECTED';
  certainty?: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  relativeEffect?: string;
  absoluteEffect?: string;
}

export interface GradeProRecommendation {
  id?: string;
  text?: string;
  direction?: 'FOR' | 'AGAINST' | 'NEITHER';
  strength?: 'STRONG' | 'CONDITIONAL';
}

export interface GradeProQuestion {
  id?: string;
  question?: string;
  population?: string;
  intervention?: string;
  comparator?: string;
  outcomes?: GradeProOutcome[];
  recommendations?: GradeProRecommendation[];
}

export interface GradeProExport {
  version?: string;
  profile?: {
    name?: string;
    description?: string;
  };
  questions?: GradeProQuestion[];
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class GradeProParserService {
  /**
   * Parse a GradePro JSON export string into a typed GradeProExport object.
   *
   * Throws BadRequestException when:
   *  - The string cannot be parsed as JSON
   *  - The top-level structure does not contain a `questions` array
   */
  parseGradeProJson(raw: string): GradeProExport {
    if (!raw || raw.trim().length === 0) {
      throw new BadRequestException('Empty input');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Invalid JSON: could not parse GradePro export file');
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new BadRequestException('Invalid GradePro format: root must be a JSON object');
    }

    const data = parsed as Record<string, unknown>;

    if (!('questions' in data) || !Array.isArray(data['questions'])) {
      throw new BadRequestException(
        'Invalid GradePro format: missing or invalid "questions" array',
      );
    }

    return data as unknown as GradeProExport;
  }
}
