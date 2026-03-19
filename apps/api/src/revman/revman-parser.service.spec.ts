import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RevmanParserService } from './revman-parser.service';

// ── Fixtures ───────────────────────────────────────────────────────────────

const DICH_XML = `<?xml version="1.0" encoding="UTF-8"?>
<COCHRANE_REVIEW TITLE="Test Review">
  <ANALYSES_AND_DATA>
    <COMPARISON NO="1" NAME="Intervention vs Control">
      <DICH_DATA NO="1" NAME="All-cause mortality">
        <DICH_SUBDATA EFFECT_SIZE="0.75" CI_START="0.60" CI_END="0.94" STUDIES="3" PARTICIPANTS="450" />
        <DICH_STUDY STUDY_ID="Smith2020">
          <DICH_DATA_ENTRY EVENTS_1="10" TOTAL_1="75" EVENTS_2="15" TOTAL_2="75" />
        </DICH_STUDY>
        <DICH_STUDY STUDY_ID="Jones2021">
          <DICH_DATA_ENTRY EVENTS_1="8" TOTAL_1="100" EVENTS_2="12" TOTAL_2="100" />
        </DICH_STUDY>
      </DICH_DATA>
    </COMPARISON>
  </ANALYSES_AND_DATA>
</COCHRANE_REVIEW>`;

const CONT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<COCHRANE_REVIEW TITLE="Continuous Outcomes Review">
  <ANALYSES_AND_DATA>
    <COMPARISON NO="1" NAME="Drug A vs Placebo">
      <CONT_DATA NO="1" NAME="Pain score (VAS)">
        <CONT_SUBDATA EFFECT_SIZE="-1.5" CI_START="-2.1" CI_END="-0.9" STUDIES="2" PARTICIPANTS="200" />
        <CONT_STUDY STUDY_ID="Brown2019">
          <CONT_DATA_ENTRY MEAN_1="3.2" MEAN_2="4.7" TOTAL_1="50" TOTAL_2="50" />
        </CONT_STUDY>
        <CONT_STUDY STUDY_ID="White2020">
          <CONT_DATA_ENTRY MEAN_1="2.9" MEAN_2="4.4" TOTAL_1="50" TOTAL_2="50" />
        </CONT_STUDY>
      </CONT_DATA>
    </COMPARISON>
  </ANALYSES_AND_DATA>
</COCHRANE_REVIEW>`;

const MIXED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<COCHRANE_REVIEW TITLE="Mixed Review">
  <ANALYSES_AND_DATA>
    <COMPARISON NO="1" NAME="Treatment A vs B">
      <DICH_DATA NO="1" NAME="Mortality">
        <DICH_STUDY STUDY_ID="Alpha2018">
          <DICH_DATA_ENTRY EVENTS_1="5" TOTAL_1="50" EVENTS_2="8" TOTAL_2="50" />
        </DICH_STUDY>
      </DICH_DATA>
      <CONT_DATA NO="2" NAME="Quality of life">
        <CONT_STUDY STUDY_ID="Beta2019">
          <CONT_DATA_ENTRY MEAN_1="7.5" MEAN_2="6.0" TOTAL_1="40" TOTAL_2="40" />
        </CONT_STUDY>
      </CONT_DATA>
    </COMPARISON>
    <COMPARISON NO="2" NAME="Subgroup Analysis">
      <DICH_DATA NO="1" NAME="Adverse events">
        <DICH_STUDY STUDY_ID="Gamma2020">
          <DICH_DATA_ENTRY EVENTS_1="2" TOTAL_1="30" EVENTS_2="3" TOTAL_2="30" />
        </DICH_STUDY>
      </DICH_DATA>
    </COMPARISON>
  </ANALYSES_AND_DATA>
</COCHRANE_REVIEW>`;

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RevmanParserService', () => {
  let service: RevmanParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RevmanParserService],
    }).compile();

    service = module.get<RevmanParserService>(RevmanParserService);
  });

  describe('parseRevManXml – basic structure', () => {
    it('extracts title from TITLE attribute on root element', () => {
      const result = service.parseRevManXml(DICH_XML);
      expect(result.title).toBe('Test Review');
    });

    it('returns empty comparisons array when ANALYSES_AND_DATA is absent', () => {
      const xml = `<COCHRANE_REVIEW TITLE="No data"></COCHRANE_REVIEW>`;
      const result = service.parseRevManXml(xml);
      expect(result.comparisons).toHaveLength(0);
    });
  });

  describe('parseRevManXml – dichotomous outcomes', () => {
    it('parses comparison name', () => {
      const result = service.parseRevManXml(DICH_XML);
      expect(result.comparisons[0].name).toBe('Intervention vs Control');
    });

    it('parses dichotomous outcome name', () => {
      const result = service.parseRevManXml(DICH_XML);
      expect(result.comparisons[0].outcomes[0].name).toBe('All-cause mortality');
    });

    it('sets type to DICHOTOMOUS', () => {
      const result = service.parseRevManXml(DICH_XML);
      expect(result.comparisons[0].outcomes[0].type).toBe('DICHOTOMOUS');
    });

    it('parses study-level data', () => {
      const result = service.parseRevManXml(DICH_XML);
      const studies = result.comparisons[0].outcomes[0].studies;
      expect(studies).toHaveLength(2);
      expect(studies[0].id).toBe('Smith2020');
      expect(studies[0].eventsIntervention).toBe(10);
      expect(studies[0].totalIntervention).toBe(75);
      expect(studies[0].eventsControl).toBe(15);
      expect(studies[0].totalControl).toBe(75);
    });

    it('parses overall effect from DICH_SUBDATA', () => {
      const result = service.parseRevManXml(DICH_XML);
      const overall = result.comparisons[0].outcomes[0].overallEffect;
      expect(overall).toBeDefined();
      expect(overall?.effect).toBeCloseTo(0.75);
      expect(overall?.ciLower).toBeCloseTo(0.60);
      expect(overall?.ciUpper).toBeCloseTo(0.94);
      expect(overall?.totalStudies).toBe(3);
      expect(overall?.totalParticipants).toBe(450);
    });
  });

  describe('parseRevManXml – continuous outcomes', () => {
    it('sets type to CONTINUOUS', () => {
      const result = service.parseRevManXml(CONT_XML);
      expect(result.comparisons[0].outcomes[0].type).toBe('CONTINUOUS');
    });

    it('parses continuous outcome name', () => {
      const result = service.parseRevManXml(CONT_XML);
      expect(result.comparisons[0].outcomes[0].name).toBe('Pain score (VAS)');
    });

    it('parses continuous study means', () => {
      const result = service.parseRevManXml(CONT_XML);
      const studies = result.comparisons[0].outcomes[0].studies;
      expect(studies).toHaveLength(2);
      expect(studies[0].id).toBe('Brown2019');
      expect(studies[0].meanIntervention).toBeCloseTo(3.2);
      expect(studies[0].meanControl).toBeCloseTo(4.7);
    });

    it('parses continuous overall effect', () => {
      const result = service.parseRevManXml(CONT_XML);
      const overall = result.comparisons[0].outcomes[0].overallEffect;
      expect(overall?.effect).toBeCloseTo(-1.5);
      expect(overall?.ciLower).toBeCloseTo(-2.1);
      expect(overall?.ciUpper).toBeCloseTo(-0.9);
    });
  });

  describe('parseRevManXml – mixed and multi-comparison', () => {
    it('handles both dichotomous and continuous outcomes in same comparison', () => {
      const result = service.parseRevManXml(MIXED_XML);
      const outcomes = result.comparisons[0].outcomes;
      expect(outcomes).toHaveLength(2);
      expect(outcomes[0].type).toBe('DICHOTOMOUS');
      expect(outcomes[1].type).toBe('CONTINUOUS');
    });

    it('handles multiple comparisons', () => {
      const result = service.parseRevManXml(MIXED_XML);
      expect(result.comparisons).toHaveLength(2);
      expect(result.comparisons[1].name).toBe('Subgroup Analysis');
    });
  });

  describe('parseRevManXml – error handling', () => {
    it('throws BadRequestException for empty string', () => {
      expect(() => service.parseRevManXml('')).toThrow(BadRequestException);
    });

    it('throws BadRequestException for non-XML input', () => {
      expect(() => service.parseRevManXml('not xml at all')).toThrow(BadRequestException);
    });

    it('returns empty comparisons for valid XML without RevMan structure', () => {
      const result = service.parseRevManXml('<ROOT><CHILD /></ROOT>');
      expect(result.comparisons).toHaveLength(0);
    });
  });
});
