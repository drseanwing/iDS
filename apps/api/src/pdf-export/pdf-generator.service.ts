import { Injectable } from '@nestjs/common';
import * as path from 'path';

/* ------------------------------------------------------------------ */
/*  pdfmake v0.3 — singleton instance with virtualfs font registration  */
/* ------------------------------------------------------------------ */
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfmake = require('pdfmake');

/* ------------------------------------------------------------------ */
/*  Types matching the shape returned by GuidelinesService.exportJson  */
/* ------------------------------------------------------------------ */

interface ExportedSection {
  id: string;
  title: string;
  content?: any; // TipTap JSON
  ordering?: number;
  parentId?: string | null;
  excludeFromNumbering?: boolean;
  sectionReferences?: any[];
  sectionPicos?: any[];
  sectionRecommendations?: any[];
  children?: ExportedSection[];
}

interface ExportedRecommendation {
  id: string;
  title?: string;
  strength?: string;
  direction?: string;
  remark?: any;
  rationale?: any;
  practicalInfo?: any;
  etdFactors?: any[];
  sectionPlacements?: any[];
}

interface ExportedOutcome {
  id: string;
  name: string;
  importance?: string;
  certaintyOfEvidence?: string;
  effectEstimate?: string;
  effectDescription?: string;
  riskWithControl?: number | null;
  riskWithIntervention?: number | null;
  ciLow?: number | null;
  ciHigh?: number | null;
  participantCount?: number | null;
  studyCount?: number | null;
  studyDesign?: string;
}

interface ExportedPico {
  id: string;
  population?: string;
  intervention?: string;
  comparator?: string;
  setting?: string;
  narrativeSummary?: any;
  outcomes?: ExportedOutcome[];
}

interface ExportedReference {
  id: string;
  title?: string;
  authors?: string;
  year?: number | null;
  journal?: string;
  doi?: string;
  url?: string;
}

export interface GuidelineExport {
  guideline: {
    id: string;
    title: string;
    shortName?: string;
    description?: string;
    language?: string;
    showSectionNumbers?: boolean;
    pdfColumnLayout?: number;
    picoDisplayMode?: string;
    coverPageUrl?: string;
  };
  organization?: { name?: string; logoUrl?: string } | null;
  sections: ExportedSection[];
  recommendations: ExportedRecommendation[];
  picos: ExportedPico[];
  references: ExportedReference[];
}

export interface PdfExportOptions {
  pdfColumnLayout?: number;
  picoDisplayMode?: string;
  showSectionNumbers?: boolean;
  includeTableOfContents?: boolean;
  coverPageUrl?: string;
}

/* ------------------------------------------------------------------ */
/*  PdfGeneratorService                                                 */
/* ------------------------------------------------------------------ */

@Injectable()
export class PdfGeneratorService {
  private readonly pdfmake: any;

  constructor() {
    // Register Roboto fonts shipped with pdfmake into its virtualfs
    const pdfmakeRoot = path.dirname(require.resolve('pdfmake/package.json'));
    const fontDir = path.join(pdfmakeRoot, 'fonts', 'Roboto');

    pdfmake.virtualfs.storage['fonts/Roboto-Regular.ttf'] = fs.readFileSync(path.join(fontDir, 'Roboto-Regular.ttf'));
    pdfmake.virtualfs.storage['fonts/Roboto-Medium.ttf'] = fs.readFileSync(path.join(fontDir, 'Roboto-Medium.ttf'));
    pdfmake.virtualfs.storage['fonts/Roboto-Italic.ttf'] = fs.readFileSync(path.join(fontDir, 'Roboto-Italic.ttf'));
    pdfmake.virtualfs.storage['fonts/Roboto-MediumItalic.ttf'] = fs.readFileSync(path.join(fontDir, 'Roboto-MediumItalic.ttf'));

    pdfmake.setFonts({
      Roboto: {
        normal: 'fonts/Roboto-Regular.ttf',
        bold: 'fonts/Roboto-Medium.ttf',
        italics: 'fonts/Roboto-Italic.ttf',
        bolditalics: 'fonts/Roboto-MediumItalic.ttf',
      },
    });

    this.pdfmake = pdfmake;
  }

  /**
   * Generate a PDF Buffer from a full guideline export payload.
   */
  async generatePdf(data: GuidelineExport, options?: PdfExportOptions): Promise<Buffer> {
    const { guideline, organization, sections, recommendations, picos, references } = data;
    const showNumbers = options?.showSectionNumbers ?? guideline.showSectionNumbers !== false;
    const columnLayout = options?.pdfColumnLayout ?? guideline.pdfColumnLayout ?? 1;
    const picoDisplayMode = options?.picoDisplayMode ?? guideline.picoDisplayMode ?? 'INLINE';
    const includeToc = options?.includeTableOfContents !== false;

    const content: any[] = [];

    // ── Title page ──────────────────────────────────────────
    content.push(
      { text: '', margin: [0, 120, 0, 0] },
      {
        text: guideline.title,
        style: 'title',
        alignment: 'center',
        margin: [0, 0, 0, 16],
      },
    );

    if (guideline.shortName) {
      content.push({
        text: guideline.shortName,
        alignment: 'center',
        italics: true,
        fontSize: 14,
        color: '#666666',
        margin: [0, 0, 0, 8],
      });
    }

    if (organization?.name) {
      content.push({
        text: organization.name,
        alignment: 'center',
        fontSize: 12,
        color: '#888888',
        margin: [0, 0, 0, 8],
      });
    }

    if (guideline.description) {
      content.push({
        text: guideline.description,
        alignment: 'center',
        fontSize: 10,
        color: '#888888',
        margin: [0, 0, 0, 20],
      });
    }

    content.push({ text: '', pageBreak: 'after' });

    // ── Table of Contents ────────────────────────────────────
    if (includeToc) {
      content.push({
        toc: { title: { text: 'Table of Contents', style: 'h1' } },
      });
      content.push({ text: '', pageBreak: 'after' });
    }

    // ── Sections ─────────────────────────────────────────────
    const sectionContent: any[] = [];
    let sectionCounter = 0;

    const renderSection = (section: ExportedSection, depth: number, numberPrefix: string) => {
      const style = depth === 0 ? 'h1' : depth === 1 ? 'h2' : 'h3';

      let displayTitle = section.title;
      if (showNumbers && !section.excludeFromNumbering) {
        sectionCounter++;
        displayTitle = `${numberPrefix}${sectionCounter} ${section.title}`;
      }

      sectionContent.push({
        text: displayTitle,
        style,
        tocItem: depth <= 2,
        tocMargin: [depth * 12, 2, 0, 2],
      });

      // Section body from TipTap JSON
      if (section.content) {
        sectionContent.push(...this.convertTipTapContent(section.content));
      }

      // Inline recommendations linked to this section
      const sectionRecIds = (section.sectionRecommendations ?? []).map(
        (sr: any) => sr.recommendationId,
      );
      const sectionRecs = recommendations.filter((r) => sectionRecIds.includes(r.id));
      for (const rec of sectionRecs) {
        sectionContent.push(...this.renderRecommendation(rec));
      }

      // Inline PICOs (if picoDisplayMode === INLINE)
      if (picoDisplayMode !== 'ANNEX') {
        const sectionPicoIds = (section.sectionPicos ?? []).map((sp: any) => sp.picoId);
        const sectionPicos = picos.filter((p) => sectionPicoIds.includes(p.id));
        for (const pico of sectionPicos) {
          sectionContent.push(...this.renderPico(pico));
        }
      }

      // Render children
      if (section.children) {
        for (const child of section.children) {
          renderSection(child, depth + 1, `${numberPrefix}${sectionCounter}.`);
        }
      }
    };

    for (const section of sections) {
      sectionCounter = 0;
      renderSection(section, 0, '');
    }

    // Apply column layout to section content
    if (columnLayout === 2 && sectionContent.length > 0) {
      content.push({
        columns: [
          { width: '*', stack: sectionContent },
        ],
        columnGap: 20,
      });
    } else {
      content.push(...sectionContent);
    }

    // ── PICOs as Annex ───────────────────────────────────────
    if (picoDisplayMode === 'ANNEX' && picos.length > 0) {
      content.push({ text: '', pageBreak: 'before' });
      content.push({
        text: 'Annex: Evidence Summaries (PICO)',
        style: 'h1',
        tocItem: true,
      });
      for (const pico of picos) {
        content.push(...this.renderPico(pico));
      }
    }

    // ── References ───────────────────────────────────────────
    if (references.length > 0) {
      content.push({ text: '', pageBreak: 'before' });
      content.push({
        text: 'References',
        style: 'h1',
        tocItem: true,
      });
      references.forEach((ref, index) => {
        content.push(this.renderReference(ref, index + 1));
      });
    }

    // ── Build document definition ────────────────────────────
    const docDefinition = {
      content,
      styles: {
        title: { fontSize: 26, bold: true, margin: [0, 0, 0, 10] as number[] },
        h1: { fontSize: 18, bold: true, margin: [0, 20, 0, 8] as number[], color: '#1a1a1a' },
        h2: { fontSize: 15, bold: true, margin: [0, 16, 0, 6] as number[], color: '#2c2c2c' },
        h3: { fontSize: 13, bold: true, margin: [0, 12, 0, 4] as number[], color: '#3c3c3c' },
        body: { fontSize: 10, lineHeight: 1.4 },
        sofHeader: { fontSize: 8, bold: true, color: '#ffffff', fillColor: '#2C3E50' },
        sofCell: { fontSize: 8 },
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.3,
      },
      pageSize: 'LETTER' as const,
      pageMargins: [72, 72, 72, 72] as [number, number, number, number],
      footer: (currentPage: number, pageCount: number) => ({
        text: `${currentPage} / ${pageCount}`,
        alignment: 'center' as const,
        fontSize: 8,
        color: '#999999',
        margin: [0, 20, 0, 0] as number[],
      }),
      info: {
        title: guideline.title,
        author: organization?.name ?? 'OpenGRADE',
        subject: guideline.description ?? '',
      },
    };

    return this.buildPdf(docDefinition);
  }

  /* ================================================================ */
  /*  Build PDF from doc definition                                     */
  /* ================================================================ */

  private async buildPdf(docDefinition: any): Promise<Buffer> {
    const doc = this.pdfmake.createPdf(docDefinition);
    const buffer = await doc.getBuffer();
    return Buffer.from(buffer);
  }

  /* ================================================================ */
  /*  TipTap JSON → pdfmake content                                    */
  /* ================================================================ */

  convertTipTapContent(content: any): any[] {
    if (!content) return [];

    // Handle string content (plain text)
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        return [{ text: content, margin: [0, 0, 0, 4] }];
      }
    }

    const nodes: any[] = content?.content ?? (Array.isArray(content) ? content : []);
    const elements: any[] = [];

    for (const node of nodes) {
      elements.push(...this.convertNode(node));
    }

    return elements;
  }

  private convertNode(node: any): any[] {
    if (!node) return [];

    switch (node.type) {
      case 'paragraph':
        return [this.convertParagraphNode(node)];

      case 'heading': {
        const level = node.attrs?.level ?? 1;
        const style = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
        return [{
          text: this.convertInlineContent(node.content),
          style,
        }];
      }

      case 'bulletList': {
        const items = (node.content ?? []).map((item: any) =>
          this.extractListItemContent(item),
        );
        return [{ ul: items, margin: [0, 4, 0, 4] }];
      }

      case 'orderedList': {
        const items = (node.content ?? []).map((item: any) =>
          this.extractListItemContent(item),
        );
        return [{ ol: items, margin: [0, 4, 0, 4] }];
      }

      case 'blockquote': {
        const inner = node.content ?? [];
        const blockContent: any[] = [];
        for (const child of inner) {
          blockContent.push(...this.convertNode(child));
        }
        return [{
          stack: blockContent,
          margin: [20, 4, 0, 4],
          border: [true, false, false, false],
          borderColor: ['#cccccc', '#cccccc', '#cccccc', '#cccccc'],
          color: '#555555',
          italics: true,
        }];
      }

      case 'codeBlock':
        return [{
          text: this.extractPlainText(node.content),
          font: 'Roboto',
          fontSize: 9,
          background: '#f5f5f5',
          margin: [8, 4, 8, 4],
          preserveLeadingSpaces: true,
        }];

      case 'horizontalRule':
        return [{
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 468, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }],
          margin: [0, 8, 0, 8],
        }];

      default:
        if (node.content) return [this.convertParagraphNode(node)];
        if (node.text) return [{ text: node.text, margin: [0, 0, 0, 4] }];
        return [];
    }
  }

  private convertParagraphNode(node: any): any {
    return {
      text: this.convertInlineContent(node.content),
      margin: [0, 0, 0, 4],
    };
  }

  private convertInlineContent(content: any[] | undefined): any[] {
    if (!content || !Array.isArray(content)) return [{ text: '' }];

    const runs: any[] = [];
    for (const item of content) {
      if (item.type === 'text') {
        const marks = item.marks ?? [];
        const run: any = { text: item.text ?? '' };

        if (marks.some((m: any) => m.type === 'bold')) run.bold = true;
        if (marks.some((m: any) => m.type === 'italic')) run.italics = true;
        if (marks.some((m: any) => m.type === 'underline')) run.decoration = 'underline';
        if (marks.some((m: any) => m.type === 'strike')) run.decoration = 'lineThrough';
        if (marks.some((m: any) => m.type === 'superscript')) run.sup = true;
        if (marks.some((m: any) => m.type === 'subscript')) run.sub = true;

        const link = marks.find((m: any) => m.type === 'link');
        if (link?.attrs?.href) run.link = link.attrs.href;

        runs.push(run);
      } else if (item.type === 'hardBreak') {
        runs.push({ text: '\n' });
      } else if (item.content) {
        runs.push(...this.convertInlineContent(item.content));
      }
    }

    return runs.length ? runs : [{ text: '' }];
  }

  private extractListItemContent(item: any): any {
    const content = item.content ?? [];
    const parts: any[] = [];
    for (const child of content) {
      if (child.type === 'paragraph') {
        parts.push({ text: this.convertInlineContent(child.content) });
      } else {
        parts.push(...this.convertNode(child));
      }
    }
    return parts.length === 1 ? parts[0] : { stack: parts };
  }

  private extractPlainText(content: any[] | undefined): string {
    if (!content) return '';
    return content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text ?? '')
      .join('');
  }

  /* ================================================================ */
  /*  Recommendation rendering                                         */
  /* ================================================================ */

  private renderRecommendation(rec: ExportedRecommendation): any[] {
    const elements: any[] = [];
    const strengthLabel = this.formatStrength(rec.strength, rec.direction);

    // Recommendation box
    const boxContent: any[] = [];

    const headerParts: any[] = [
      { text: 'Recommendation', bold: true, fontSize: 11 },
    ];
    if (strengthLabel) {
      headerParts.push({
        text: `  [${strengthLabel}]`,
        bold: true,
        color: '#2E86C1',
        fontSize: 10,
      });
    }
    boxContent.push({ text: headerParts, margin: [0, 0, 0, 4] });

    if (rec.title) {
      boxContent.push({ text: rec.title, bold: true, margin: [0, 0, 0, 4] });
    }

    if (rec.remark) {
      boxContent.push({ text: [{ text: 'Remark: ', bold: true, italics: true }], margin: [0, 4, 0, 0] });
      boxContent.push(...this.convertTipTapContent(rec.remark));
    }

    if (rec.rationale) {
      boxContent.push({ text: [{ text: 'Rationale: ', bold: true, italics: true }], margin: [0, 4, 0, 0] });
      boxContent.push(...this.convertTipTapContent(rec.rationale));
    }

    if (rec.practicalInfo) {
      boxContent.push({ text: [{ text: 'Practical Information: ', bold: true, italics: true }], margin: [0, 4, 0, 0] });
      boxContent.push(...this.convertTipTapContent(rec.practicalInfo));
    }

    elements.push({
      table: {
        widths: ['*'],
        body: [[{ stack: boxContent, margin: [8, 8, 8, 8] }]],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
        hLineColor: () => '#4A90D9',
        vLineColor: () => '#4A90D9',
        fillColor: () => '#EBF5FB',
      },
      margin: [0, 8, 0, 8],
    });

    return elements;
  }

  private formatStrength(strength?: string, direction?: string): string {
    const parts: string[] = [];
    if (strength) parts.push(strength.replace(/_/g, ' '));
    if (direction) {
      parts.push(
        direction === 'FOR' ? 'in favour' :
        direction === 'AGAINST' ? 'against' :
        direction.toLowerCase(),
      );
    }
    return parts.length ? parts.join(', ') : '';
  }

  /* ================================================================ */
  /*  PICO & Summary of Findings table rendering                       */
  /* ================================================================ */

  private renderPico(pico: ExportedPico): any[] {
    const elements: any[] = [];

    elements.push({ text: 'PICO Question', style: 'h2' });

    const picoFields: [string, string | undefined][] = [
      ['Population', pico.population],
      ['Intervention', pico.intervention],
      ['Comparator', pico.comparator],
      ['Setting', pico.setting],
    ];

    for (const [label, value] of picoFields) {
      if (value) {
        elements.push({
          text: [
            { text: `${label}: `, bold: true },
            { text: value },
          ],
          margin: [0, 0, 0, 2],
        });
      }
    }

    if (pico.narrativeSummary) {
      elements.push({
        text: [{ text: 'Summary: ', bold: true, italics: true }],
        margin: [0, 4, 0, 0],
      });
      elements.push(...this.convertTipTapContent(pico.narrativeSummary));
    }

    if (pico.outcomes && pico.outcomes.length > 0) {
      elements.push({ text: 'Summary of Findings', style: 'h3' });
      elements.push(this.renderSofTable(pico.outcomes));
    }

    return elements;
  }

  private renderSofTable(outcomes: ExportedOutcome[]): any {
    const headers = ['Outcome', 'Importance', 'Effect', 'Participants\n(studies)', 'Certainty'];

    const headerRow = headers.map((text) => ({
      text,
      style: 'sofHeader',
      alignment: 'center',
    }));

    const dataRows = outcomes.map((outcome) => [
      { text: outcome.name ?? '', style: 'sofCell' },
      { text: outcome.importance ?? '-', style: 'sofCell' },
      { text: this.formatEffect(outcome), style: 'sofCell' },
      { text: this.formatParticipants(outcome), style: 'sofCell' },
      { text: this.formatCertainty(outcome.certaintyOfEvidence), style: 'sofCell' },
    ]);

    return {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', '*', 'auto', 'auto'],
        body: [headerRow, ...dataRows],
      },
      layout: {
        fillColor: (rowIndex: number) => (rowIndex === 0 ? '#2C3E50' : null),
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 4, 0, 8],
    };
  }

  private formatEffect(outcome: ExportedOutcome): string {
    if (outcome.effectEstimate) return outcome.effectEstimate;
    if (outcome.effectDescription) return outcome.effectDescription;
    const parts: string[] = [];
    if (outcome.riskWithControl != null) parts.push(`Control: ${outcome.riskWithControl}`);
    if (outcome.riskWithIntervention != null) parts.push(`Intervention: ${outcome.riskWithIntervention}`);
    if (outcome.ciLow != null && outcome.ciHigh != null) parts.push(`CI: ${outcome.ciLow}–${outcome.ciHigh}`);
    return parts.length ? parts.join('; ') : '-';
  }

  private formatParticipants(outcome: ExportedOutcome): string {
    const parts: string[] = [];
    if (outcome.participantCount != null) parts.push(`${outcome.participantCount}`);
    if (outcome.studyCount != null) parts.push(`(${outcome.studyCount} ${outcome.studyCount === 1 ? 'study' : 'studies'})`);
    return parts.length ? parts.join(' ') : '-';
  }

  private formatCertainty(certainty?: string): string {
    if (!certainty) return '-';
    const map: Record<string, string> = {
      HIGH: 'High',
      MODERATE: 'Moderate',
      LOW: 'Low',
      VERY_LOW: 'Very Low',
    };
    return map[certainty] || certainty.replace(/_/g, ' ');
  }

  /* ================================================================ */
  /*  Reference rendering                                              */
  /* ================================================================ */

  private renderReference(ref: ExportedReference, number: number): any {
    const parts: any[] = [{ text: `${number}. `, bold: true }];

    if (ref.authors) parts.push({ text: ref.authors });
    if (ref.title) {
      if (ref.authors) parts.push({ text: '. ' });
      parts.push({ text: ref.title, italics: true });
    }
    if (ref.journal) parts.push({ text: `. ${ref.journal}` });
    if (ref.year != null) parts.push({ text: ` (${ref.year})` });
    if (ref.doi) parts.push({ text: `. doi: ${ref.doi}` });

    return {
      text: parts,
      margin: [18, 0, 0, 4],
      leadingIndent: -18,
    };
  }
}
