import { BadRequestException } from '@nestjs/common';
import { GradeProParserService } from './gradepro-parser.service';

describe('GradeProParserService', () => {
  let service: GradeProParserService;

  beforeEach(() => {
    service = new GradeProParserService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws BadRequestException for empty input', () => {
    expect(() => service.parseGradeProJson('')).toThrow(BadRequestException);
    expect(() => service.parseGradeProJson('   ')).toThrow(BadRequestException);
  });

  it('throws BadRequestException for invalid JSON', () => {
    expect(() => service.parseGradeProJson('not json {')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when root is not an object', () => {
    expect(() => service.parseGradeProJson('[1, 2, 3]')).toThrow(BadRequestException);
    expect(() => service.parseGradeProJson('"a string"')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when questions field is missing', () => {
    expect(() => service.parseGradeProJson('{"version": "1.0"}')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when questions is not an array', () => {
    expect(() => service.parseGradeProJson('{"questions": "invalid"}')).toThrow(BadRequestException);
  });

  it('returns parsed object for valid minimal export', () => {
    const result = service.parseGradeProJson('{"questions": []}');
    expect(result).toEqual({ questions: [] });
  });

  it('returns full typed export with profile and questions', () => {
    const input = JSON.stringify({
      version: '2.0',
      profile: { name: 'Diabetes Guidelines' },
      questions: [
        {
          id: 'q1',
          question: 'Should patients receive treatment A?',
          population: 'Adults with T2DM',
          intervention: 'Treatment A',
          comparator: 'Placebo',
          outcomes: [{ name: 'HbA1c reduction', certainty: 'HIGH' }],
          recommendations: [{ text: 'Use treatment A', strength: 'STRONG', direction: 'FOR' }],
        },
      ],
    });
    const result = service.parseGradeProJson(input);
    expect(result.version).toBe('2.0');
    expect(result.profile?.name).toBe('Diabetes Guidelines');
    expect(result.questions).toHaveLength(1);
    expect(result.questions![0].outcomes).toHaveLength(1);
    expect(result.questions![0].recommendations![0].strength).toBe('STRONG');
  });
});
