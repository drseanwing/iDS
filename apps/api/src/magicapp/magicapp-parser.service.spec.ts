import { BadRequestException } from '@nestjs/common';
import { MagicAppParserService } from './magicapp-parser.service';

describe('MagicAppParserService', () => {
  let service: MagicAppParserService;

  beforeEach(() => {
    service = new MagicAppParserService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws BadRequestException for empty input', () => {
    expect(() => service.parse('')).toThrow(BadRequestException);
    expect(() => service.parse('   ')).toThrow(BadRequestException);
  });

  it('throws BadRequestException for invalid JSON', () => {
    expect(() => service.parse('not json {')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when root is not an object', () => {
    expect(() => service.parse('[1, 2, 3]')).toThrow(BadRequestException);
    expect(() => service.parse('"a string"')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when sections field is missing', () => {
    expect(() => service.parse('{"title": "My guideline"}')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when sections is not an array', () => {
    expect(() => service.parse('{"sections": "invalid"}')).toThrow(BadRequestException);
  });

  it('returns parsed object for valid minimal export', () => {
    const result = service.parse('{"sections": []}');
    expect(result).toEqual({ sections: [] });
  });

  it('returns full typed export with sections, subsections, recommendations, and references', () => {
    const input = JSON.stringify({
      version: '1.0',
      title: 'Hypertension Guidelines',
      description: 'Evidence-based guidelines',
      sections: [
        {
          id: 's1',
          title: 'Background',
          content: 'Some background text',
          subsections: [
            {
              id: 'ss1',
              title: 'Epidemiology',
              content: 'Epidemiology text',
              recommendations: [
                {
                  id: 'r1',
                  text: 'Recommend treatment X',
                  strength: 'STRONG_FOR',
                  certainty: 'HIGH',
                  rationale: 'Strong evidence',
                  references: [{ title: 'Study A', doi: '10.1000/xyz', year: 2022 }],
                },
              ],
            },
          ],
        },
      ],
    });
    const result = service.parse(input);
    expect(result.title).toBe('Hypertension Guidelines');
    expect(result.sections).toHaveLength(1);
    expect(result.sections![0].subsections).toHaveLength(1);
    const rec = result.sections![0].subsections![0].recommendations![0];
    expect(rec.strength).toBe('STRONG_FOR');
    expect(rec.references![0].doi).toBe('10.1000/xyz');
  });
});
