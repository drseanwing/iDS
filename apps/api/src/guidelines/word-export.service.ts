import { Injectable } from '@nestjs/common';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  PageBreak,
  TableOfContents,
  StyleLevel,
  Footer,
  PageNumber,
  NumberFormat,
  type FileChild,
} from 'docx';

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

interface GuidelineExport {
  guideline: {
    id: string;
    title: string;
    shortName?: string;
    description?: string;
    language?: string;
    showSectionNumbers?: boolean;
    pdfColumnLayout?: number;
    picoDisplayMode?: string;
  };
  organization?: { name?: string; logoUrl?: string } | null;
  sections: ExportedSection[];
  recommendations: ExportedRecommendation[];
  picos: ExportedPico[];
  references: ExportedReference[];
}

/* ------------------------------------------------------------------ */
/*  WordExportService                                                  */
/* ------------------------------------------------------------------ */

@Injectable()
export class WordExportService {
  /**
   * Generate a DOCX Buffer from a full guideline export payload.
   */
  async generateDocx(data: GuidelineExport): Promise<Buffer> {
    const { guideline, organization, sections, recommendations, picos, references } = data;
    const showNumbers = guideline.showSectionNumbers !== false;

    const children: FileChild[] = [];

    // ── Title page ────────────────────────────────────────────
    children.push(
      new Paragraph({ text: '', spacing: { before: 3000 } }),
      new Paragraph({
        text: guideline.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    );
    if (guideline.shortName) {
      children.push(
        new Paragraph({
          text: guideline.shortName,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: guideline.shortName, italics: true, size: 24 })],
        }),
      );
    }
    if (organization?.name) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: organization.name, size: 24 })],
        }),
      );
    }
    if (guideline.description) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: guideline.description, size: 20 })],
        }),
      );
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // ── Table of Contents ─────────────────────────────────────
    children.push(
      new Paragraph({
        text: 'Table of Contents',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
    );
    children.push(
      new TableOfContents('Table of Contents', {
        hyperlink: true,
        headingStyleRange: '1-3',
        stylesWithLevels: [
          new StyleLevel('Heading1', 1),
          new StyleLevel('Heading2', 2),
          new StyleLevel('Heading3', 3),
        ],
      }),
    );
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // ── Sections ──────────────────────────────────────────────
    let sectionCounter = 0;
    const renderSection = (section: ExportedSection, depth: number, numberPrefix: string) => {
      const heading =
        depth === 0 ? HeadingLevel.HEADING_1 :
        depth === 1 ? HeadingLevel.HEADING_2 :
        HeadingLevel.HEADING_3;

      let displayTitle = section.title;
      if (showNumbers && !section.excludeFromNumbering) {
        sectionCounter++;
        displayTitle = `${numberPrefix}${sectionCounter} ${section.title}`;
      }

      children.push(
        new Paragraph({
          text: displayTitle,
          heading,
          spacing: { before: depth === 0 ? 400 : 200, after: 100 },
        }),
      );

      // Section body from TipTap JSON
      if (section.content) {
        const paragraphs = this.convertTipTapContent(section.content);
        children.push(...paragraphs);
      }

      // Inline recommendations linked to this section
      const sectionRecIds = (section.sectionRecommendations ?? []).map(
        (sr: any) => sr.recommendationId,
      );
      const sectionRecs = recommendations.filter((r) => sectionRecIds.includes(r.id));
      for (const rec of sectionRecs) {
        children.push(...this.renderRecommendation(rec));
      }

      // Inline PICOs (if picoDisplayMode === INLINE)
      if (guideline.picoDisplayMode !== 'ANNEX') {
        const sectionPicoIds = (section.sectionPicos ?? []).map((sp: any) => sp.picoId);
        const sectionPicos = picos.filter((p) => sectionPicoIds.includes(p.id));
        for (const pico of sectionPicos) {
          children.push(...this.renderPico(pico));
        }
      }

      // Render children
      if (section.children) {
        let childCounter = 0;
        for (const child of section.children) {
          childCounter++;
          renderSection(child, depth + 1, `${numberPrefix}${sectionCounter}.`);
        }
      }
    };

    let topCounter = 0;
    for (const section of sections) {
      sectionCounter = 0;
      topCounter++;
      renderSection(section, 0, `${showNumbers ? '' : ''}`);
    }

    // ── PICOs as Annex (if picoDisplayMode === ANNEX) ─────────
    if (guideline.picoDisplayMode === 'ANNEX' && picos.length > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(
        new Paragraph({
          text: 'Annex: Evidence Summaries (PICO)',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        }),
      );
      for (const pico of picos) {
        children.push(...this.renderPico(pico));
      }
    }

    // ── References ────────────────────────────────────────────
    if (references.length > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(
        new Paragraph({
          text: 'References',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        }),
      );
      references.forEach((ref, index) => {
        children.push(this.renderReference(ref, index + 1));
      });
    }

    const doc = new Document({
      features: { updateFields: true },
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840 }, // Letter size in twips
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
            },
          },
          headers: {},
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ children: [PageNumber.CURRENT] }),
                    new TextRun({ text: ' / ' }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
      numbering: { config: [] },
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }

  /* ================================================================ */
  /*  TipTap JSON → DOCX paragraphs                                   */
  /* ================================================================ */

  convertTipTapContent(content: any): Paragraph[] {
    if (!content) return [];

    // Handle string content (plain text)
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        return [new Paragraph({ text: content })];
      }
    }

    // TipTap JSON has { type: 'doc', content: [...nodes] }
    const nodes: any[] = content?.content ?? (Array.isArray(content) ? content : []);
    const paragraphs: Paragraph[] = [];

    for (const node of nodes) {
      paragraphs.push(...this.convertNode(node));
    }

    return paragraphs;
  }

  private convertNode(node: any): Paragraph[] {
    if (!node) return [];

    switch (node.type) {
      case 'paragraph':
        return [this.convertParagraphNode(node)];

      case 'heading': {
        const level = node.attrs?.level ?? 1;
        const heading =
          level === 1 ? HeadingLevel.HEADING_1 :
          level === 2 ? HeadingLevel.HEADING_2 :
          level === 3 ? HeadingLevel.HEADING_3 :
          HeadingLevel.HEADING_4;
        return [
          new Paragraph({
            heading,
            children: this.convertInlineContent(node.content),
          }),
        ];
      }

      case 'bulletList':
      case 'orderedList': {
        const items: Paragraph[] = [];
        const listItems = node.content ?? [];
        for (const item of listItems) {
          items.push(...this.convertListItem(item, node.type === 'orderedList'));
        }
        return items;
      }

      case 'blockquote': {
        const inner = node.content ?? [];
        const paragraphs: Paragraph[] = [];
        for (const child of inner) {
          const converted = this.convertNode(child);
          for (const p of converted) {
            paragraphs.push(
              new Paragraph({
                indent: { left: 720 }, // 0.5 inch
                children: [
                  new TextRun({ text: '│ ', color: '999999' }),
                  ...(this.convertInlineContent(child.content ?? [])),
                ],
              }),
            );
          }
        }
        return paragraphs.length ? paragraphs : [new Paragraph({ text: '' })];
      }

      case 'codeBlock':
        return [
          new Paragraph({
            shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
            children: this.convertInlineContent(node.content),
          }),
        ];

      case 'horizontalRule':
        return [
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
            text: '',
          }),
        ];

      default:
        // Unknown node type – try to extract text
        if (node.content) {
          return [this.convertParagraphNode(node)];
        }
        if (node.text) {
          return [new Paragraph({ children: [new TextRun({ text: node.text })] })];
        }
        return [];
    }
  }

  private convertParagraphNode(node: any): Paragraph {
    return new Paragraph({
      children: this.convertInlineContent(node.content),
      spacing: { after: 100 },
    });
  }

  private convertInlineContent(content: any[] | undefined): TextRun[] {
    if (!content || !Array.isArray(content)) return [new TextRun({ text: '' })];

    const runs: TextRun[] = [];
    for (const item of content) {
      if (item.type === 'text') {
        const marks = item.marks ?? [];
        const bold = marks.some((m: any) => m.type === 'bold');
        const italic = marks.some((m: any) => m.type === 'italic');
        const underline = marks.some((m: any) => m.type === 'underline');
        const strike = marks.some((m: any) => m.type === 'strike');
        const superscript = marks.some((m: any) => m.type === 'superscript');
        const subscript = marks.some((m: any) => m.type === 'subscript');

        runs.push(
          new TextRun({
            text: item.text ?? '',
            bold,
            italics: italic,
            underline: underline ? {} : undefined,
            strike,
            superScript: superscript,
            subScript: subscript,
          }),
        );
      } else if (item.type === 'hardBreak') {
        runs.push(new TextRun({ text: '', break: 1 }));
      } else if (item.content) {
        runs.push(...this.convertInlineContent(item.content));
      }
    }

    return runs.length ? runs : [new TextRun({ text: '' })];
  }

  private convertListItem(node: any, ordered: boolean): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const content = node.content ?? [];
    for (const child of content) {
      if (child.type === 'paragraph') {
        paragraphs.push(
          new Paragraph({
            indent: { left: 360, hanging: 180 },
            children: [
              new TextRun({ text: ordered ? '• ' : '• ' }),
              ...this.convertInlineContent(child.content),
            ],
            spacing: { after: 40 },
          }),
        );
      } else {
        paragraphs.push(...this.convertNode(child));
      }
    }
    return paragraphs;
  }

  /* ================================================================ */
  /*  Recommendation rendering                                         */
  /* ================================================================ */

  private renderRecommendation(rec: ExportedRecommendation): FileChild[] {
    const paragraphs: FileChild[] = [];

    // Recommendation heading with strength badge
    const strengthLabel = this.formatStrength(rec.strength, rec.direction);
    paragraphs.push(
      new Paragraph({
        spacing: { before: 300, after: 100 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 1, color: '4A90D9' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: '4A90D9' },
          left: { style: BorderStyle.SINGLE, size: 4, color: '4A90D9' },
          right: { style: BorderStyle.SINGLE, size: 1, color: '4A90D9' },
        },
        shading: { type: ShadingType.SOLID, color: 'EBF5FB' },
        children: [
          new TextRun({ text: 'Recommendation', bold: true, size: 22 }),
          ...(strengthLabel ? [new TextRun({ text: `  [${strengthLabel}]`, bold: true, color: '2E86C1', size: 20 })] : []),
        ],
      }),
    );

    if (rec.title) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: rec.title, bold: true })],
        }),
      );
    }

    // Remark
    if (rec.remark) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({ text: 'Remark: ', bold: true, italics: true })],
        }),
      );
      paragraphs.push(...this.convertTipTapContent(rec.remark));
    }

    // Rationale
    if (rec.rationale) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({ text: 'Rationale: ', bold: true, italics: true })],
        }),
      );
      paragraphs.push(...this.convertTipTapContent(rec.rationale));
    }

    // Practical information
    if (rec.practicalInfo) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({ text: 'Practical Information: ', bold: true, italics: true })],
        }),
      );
      paragraphs.push(...this.convertTipTapContent(rec.practicalInfo));
    }

    // Spacer
    paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));

    return paragraphs;
  }

  private formatStrength(strength?: string, direction?: string): string {
    const parts: string[] = [];
    if (strength) {
      parts.push(strength.replace(/_/g, ' '));
    }
    if (direction) {
      parts.push(direction === 'FOR' ? 'in favour' : direction === 'AGAINST' ? 'against' : direction.toLowerCase());
    }
    return parts.length ? parts.join(', ') : '';
  }

  /* ================================================================ */
  /*  PICO & Summary of Findings table rendering                       */
  /* ================================================================ */

  private renderPico(pico: ExportedPico): FileChild[] {
    const paragraphs: FileChild[] = [];

    paragraphs.push(
      new Paragraph({
        text: 'PICO Question',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }),
    );

    // PICO components
    const picoFields: [string, string | undefined][] = [
      ['Population', pico.population],
      ['Intervention', pico.intervention],
      ['Comparator', pico.comparator],
      ['Setting', pico.setting],
    ];

    for (const [label, value] of picoFields) {
      if (value) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `${label}: `, bold: true }),
              new TextRun({ text: value }),
            ],
          }),
        );
      }
    }

    // Narrative summary
    if (pico.narrativeSummary) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({ text: 'Summary: ', bold: true, italics: true })],
        }),
      );
      paragraphs.push(...this.convertTipTapContent(pico.narrativeSummary));
    }

    // Summary of Findings table
    if (pico.outcomes && pico.outcomes.length > 0) {
      paragraphs.push(
        new Paragraph({
          text: 'Summary of Findings',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        }),
      );
      paragraphs.push(...this.renderSofTable(pico.outcomes));
    }

    return paragraphs;
  }

  private renderSofTable(outcomes: ExportedOutcome[]): FileChild[] {
    const headerCells = [
      'Outcome',
      'Importance',
      'Effect',
      'Participants (studies)',
      'Certainty',
    ];

    const headerRow = new TableRow({
      tableHeader: true,
      children: headerCells.map(
        (text) =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: '2C3E50' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 }),
                ],
              }),
            ],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
      ),
    });

    const dataRows = outcomes.map(
      (outcome, idx) =>
        new TableRow({
          children: [
            this.sofCell(outcome.name ?? ''),
            this.sofCell(outcome.importance ?? '-'),
            this.sofCell(this.formatEffect(outcome)),
            this.sofCell(this.formatParticipants(outcome)),
            this.sofCell(this.formatCertainty(outcome.certaintyOfEvidence)),
          ],
        }),
    );

    return [
      new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
    ];
  }

  private sofCell(text: string): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text, size: 18 })],
          spacing: { before: 40, after: 40 },
        }),
      ],
      width: { size: 20, type: WidthType.PERCENTAGE },
    });
  }

  private formatEffect(outcome: ExportedOutcome): string {
    if (outcome.effectEstimate) return outcome.effectEstimate;
    if (outcome.effectDescription) return outcome.effectDescription;

    const parts: string[] = [];
    if (outcome.riskWithControl != null) {
      parts.push(`Control: ${outcome.riskWithControl}`);
    }
    if (outcome.riskWithIntervention != null) {
      parts.push(`Intervention: ${outcome.riskWithIntervention}`);
    }
    if (outcome.ciLow != null && outcome.ciHigh != null) {
      parts.push(`CI: ${outcome.ciLow}–${outcome.ciHigh}`);
    }
    return parts.length ? parts.join('; ') : '-';
  }

  private formatParticipants(outcome: ExportedOutcome): string {
    const parts: string[] = [];
    if (outcome.participantCount != null) {
      parts.push(`${outcome.participantCount}`);
    }
    if (outcome.studyCount != null) {
      parts.push(`(${outcome.studyCount} ${outcome.studyCount === 1 ? 'study' : 'studies'})`);
    }
    return parts.length ? parts.join(' ') : '-';
  }

  private formatCertainty(certainty?: string): string {
    if (!certainty) return '-';
    // Convert enum values like HIGH, MODERATE, LOW, VERY_LOW to display labels
    const map: Record<string, string> = {
      HIGH: '⊕⊕⊕⊕ High',
      MODERATE: '⊕⊕⊕◯ Moderate',
      LOW: '⊕⊕◯◯ Low',
      VERY_LOW: '⊕◯◯◯ Very Low',
    };
    return map[certainty] || certainty.replace(/_/g, ' ');
  }

  /* ================================================================ */
  /*  Reference rendering                                              */
  /* ================================================================ */

  private renderReference(ref: ExportedReference, number: number): Paragraph {
    const parts: TextRun[] = [
      new TextRun({ text: `${number}. `, bold: true }),
    ];

    if (ref.authors) {
      parts.push(new TextRun({ text: ref.authors }));
    }

    if (ref.title) {
      if (ref.authors) parts.push(new TextRun({ text: '. ' }));
      parts.push(new TextRun({ text: ref.title, italics: true }));
    }

    if (ref.journal) {
      parts.push(new TextRun({ text: `. ${ref.journal}` }));
    }

    if (ref.year != null) {
      parts.push(new TextRun({ text: ` (${ref.year})` }));
    }

    if (ref.doi) {
      parts.push(new TextRun({ text: `. doi: ${ref.doi}` }));
    }

    return new Paragraph({
      children: parts,
      spacing: { after: 80 },
      indent: { left: 360, hanging: 360 },
    });
  }
}
