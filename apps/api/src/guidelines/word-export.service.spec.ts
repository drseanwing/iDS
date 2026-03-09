import { Test, TestingModule } from '@nestjs/testing';
import { WordExportService } from './word-export.service';

const sampleExportData = {
  guideline: {
    id: 'g-1',
    title: 'Test Guideline',
    shortName: 'TG-2026',
    description: 'A sample guideline for testing DOCX export.',
    language: 'en',
    showSectionNumbers: true,
    pdfColumnLayout: 1,
    picoDisplayMode: 'INLINE',
  },
  organization: { name: 'Acme Health', logoUrl: null },
  sections: [
    {
      id: 's-1',
      title: 'Introduction',
      ordering: 0,
      parentId: null,
      excludeFromNumbering: false,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is the ' },
              { type: 'text', text: 'introduction', marks: [{ type: 'bold' }] },
              { type: 'text', text: ' to the guideline.' },
            ],
          },
        ],
      },
      sectionReferences: [],
      sectionPicos: [],
      sectionRecommendations: [{ recommendationId: 'r-1' }],
      children: [
        {
          id: 's-1-1',
          title: 'Background',
          ordering: 0,
          parentId: 's-1',
          excludeFromNumbering: false,
          content: null,
          sectionReferences: [],
          sectionPicos: [{ picoId: 'p-1' }],
          sectionRecommendations: [],
          children: [],
        },
      ],
    },
    {
      id: 's-2',
      title: 'Methods',
      ordering: 1,
      parentId: null,
      excludeFromNumbering: false,
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Systematic review methods.' }] }] },
      sectionReferences: [],
      sectionPicos: [],
      sectionRecommendations: [],
      children: [],
    },
  ],
  recommendations: [
    {
      id: 'r-1',
      title: 'Use intervention X for condition Y',
      strength: 'STRONG',
      direction: 'FOR',
      remark: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Important remark.' }] }] },
      rationale: null,
      practicalInfo: null,
      etdFactors: [],
      sectionPlacements: [{ sectionId: 's-1' }],
    },
  ],
  picos: [
    {
      id: 'p-1',
      population: 'Adults with condition Y',
      intervention: 'Intervention X',
      comparator: 'Placebo',
      setting: 'Outpatient',
      narrativeSummary: null,
      outcomes: [
        {
          id: 'o-1',
          name: 'Mortality',
          importance: 'CRITICAL',
          certaintyOfEvidence: 'MODERATE',
          effectEstimate: 'RR 0.85',
          effectDescription: null,
          riskWithControl: null,
          riskWithIntervention: null,
          ciLow: 0.72,
          ciHigh: 0.98,
          participantCount: 1200,
          studyCount: 3,
          studyDesign: 'RCT',
        },
        {
          id: 'o-2',
          name: 'Quality of Life',
          importance: 'IMPORTANT',
          certaintyOfEvidence: 'LOW',
          effectEstimate: null,
          effectDescription: 'Moderate improvement on QoL scale',
          riskWithControl: null,
          riskWithIntervention: null,
          ciLow: null,
          ciHigh: null,
          participantCount: 800,
          studyCount: 2,
          studyDesign: 'RCT',
        },
      ],
    },
  ],
  references: [
    {
      id: 'ref-1',
      title: 'A systematic review of intervention X',
      authors: 'Smith J, Doe A',
      year: 2024,
      journal: 'BMJ Evidence',
      doi: '10.1234/example',
      url: null,
    },
    {
      id: 'ref-2',
      title: 'Randomized trial of intervention X',
      authors: 'Johnson B',
      year: 2023,
      journal: 'The Lancet',
      doi: null,
      url: 'https://example.com/paper',
    },
  ],
};

describe('WordExportService', () => {
  let service: WordExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WordExportService],
    }).compile();

    service = module.get<WordExportService>(WordExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDocx', () => {
    it('should generate a valid DOCX buffer from sample data', async () => {
      const buffer = await service.generateDocx(sampleExportData as any);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // DOCX files are ZIP archives; the first two bytes should be PK
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
    });

    it('should generate DOCX for a minimal guideline (no sections/recs)', async () => {
      const minimal = {
        guideline: { id: 'g-min', title: 'Minimal Guideline' },
        organization: null,
        sections: [],
        recommendations: [],
        picos: [],
        references: [],
      };

      const buffer = await service.generateDocx(minimal as any);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('should generate DOCX with ANNEX picoDisplayMode', async () => {
      const data = {
        ...sampleExportData,
        guideline: {
          ...sampleExportData.guideline,
          picoDisplayMode: 'ANNEX',
        },
        // Remove picos from section links to avoid inline rendering
        sections: sampleExportData.sections.map((s) => ({
          ...s,
          sectionPicos: [],
          children: s.children?.map((c) => ({ ...c, sectionPicos: [] })) ?? [],
        })),
      };

      const buffer = await service.generateDocx(data as any);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate DOCX without section numbers', async () => {
      const data = {
        ...sampleExportData,
        guideline: {
          ...sampleExportData.guideline,
          showSectionNumbers: false,
        },
      };

      const buffer = await service.generateDocx(data as any);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('convertTipTapContent', () => {
    it('should convert basic paragraph TipTap content', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }],
          },
        ],
      };

      const paragraphs = service.convertTipTapContent(content);
      expect(paragraphs.length).toBe(1);
    });

    it('should convert heading nodes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Section Title' }],
          },
        ],
      };

      const paragraphs = service.convertTipTapContent(content);
      expect(paragraphs.length).toBe(1);
    });

    it('should handle bullet list nodes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Item 1' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Item 2' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const paragraphs = service.convertTipTapContent(content);
      expect(paragraphs.length).toBe(2);
    });

    it('should handle ordered list nodes with numbering', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'First' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Second' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const paragraphs = service.convertTipTapContent(content);
      expect(paragraphs.length).toBe(2);
    });

    it('should handle null content', () => {
      const paragraphs = service.convertTipTapContent(null);
      expect(paragraphs).toEqual([]);
    });

    it('should handle string content', () => {
      const paragraphs = service.convertTipTapContent('Plain text content');
      expect(paragraphs.length).toBe(1);
    });

    it('should handle JSON string content', () => {
      const jsonStr = JSON.stringify({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'From JSON string' }] },
        ],
      });
      const paragraphs = service.convertTipTapContent(jsonStr);
      expect(paragraphs.length).toBe(1);
    });

    it('should handle bold and italic marks', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Bold text',
                marks: [{ type: 'bold' }, { type: 'italic' }],
              },
            ],
          },
        ],
      };

      const paragraphs = service.convertTipTapContent(content);
      expect(paragraphs.length).toBe(1);
    });

    it('should handle blockquote nodes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Quoted text' }],
              },
            ],
          },
        ],
      };

      const paragraphs = service.convertTipTapContent(content);
      expect(paragraphs.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle codeBlock nodes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'const x = 42;' }],
          },
        ],
      };

      const paragraphs = service.convertTipTapContent(content);
      expect(paragraphs.length).toBe(1);
    });

    it('should handle horizontalRule nodes', () => {
      const content = {
        type: 'doc',
        content: [{ type: 'horizontalRule' }],
      };

      const paragraphs = service.convertTipTapContent(content);
      expect(paragraphs.length).toBe(1);
    });
  });
});
