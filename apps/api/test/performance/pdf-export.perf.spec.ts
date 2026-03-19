/**
 * Performance tests for PDF document definition building.
 * Tests the document definition construction logic without actually calling pdfmake.
 */

import { createLargeGuideline } from './fixtures/large-guideline';

// Mock pdfmake so we don't actually render PDFs in performance tests
jest.mock('pdfmake', () => {
  return {
    virtualfs: { storage: {} },
    setFonts: jest.fn(),
    createPdf: jest.fn(() => ({
      getBuffer: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock')),
    })),
  };
}, { virtual: true });

// Also mock fs.readFileSync for font loading
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-font-data')),
}));

// Mock require.resolve for pdfmake fonts path
jest.mock('module', () => {
  const actual = jest.requireActual('module');
  return {
    ...actual,
  };
});

describe('PDF Export Performance', () => {
  it('should generate PDF document definition for large guideline in < 5 seconds', async () => {
    const data = createLargeGuideline({
      sectionCount: 100,
      recsPerSection: 2,
      outcomesPerPico: 5,
    });

    // Import after mock setup
    const { PdfGeneratorService } = await import(
      '../../src/pdf-export/pdf-generator.service'
    );

    const service = new PdfGeneratorService();

    const exportData = {
      guideline: data.guideline,
      organization: data.organization,
      sections: data.sections,
      recommendations: data.recommendations,
      picos: data.picos,
      references: data.references,
    };

    const start = performance.now();
    const result = await service.generatePdf(exportData, {
      showSectionNumbers: true,
      includeTableOfContents: true,
    });
    const elapsed = performance.now() - start;

    expect(result).toBeInstanceOf(Buffer);
    expect(elapsed).toBeLessThan(5000);
  });

  it('should build TipTap content conversion for 1000 paragraphs in < 500ms', async () => {
    const { PdfGeneratorService } = await import(
      '../../src/pdf-export/pdf-generator.service'
    );

    const service = new PdfGeneratorService();

    const largeTipTap = {
      type: 'doc',
      content: Array.from({ length: 1000 }, (_, i) => ({
        type: 'paragraph',
        content: [
          { type: 'text', text: `Paragraph ${i}: ` },
          { type: 'text', text: 'Bold text', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' and normal text' },
        ],
      })),
    };

    const start = performance.now();
    const result = service.convertTipTapContent(largeTipTap);
    const elapsed = performance.now() - start;

    expect(result.length).toBe(1000);
    expect(elapsed).toBeLessThan(500);
  });

  it('should handle PDF generation for minimal guideline quickly', async () => {
    const { PdfGeneratorService } = await import(
      '../../src/pdf-export/pdf-generator.service'
    );

    const service = new PdfGeneratorService();

    const start = performance.now();
    const result = await service.generatePdf({
      guideline: {
        id: 'g1',
        title: 'Minimal Guideline',
      },
      organization: null,
      sections: [],
      recommendations: [],
      picos: [],
      references: [],
    });
    const elapsed = performance.now() - start;

    expect(result).toBeInstanceOf(Buffer);
    expect(elapsed).toBeLessThan(1000);
  });
});
