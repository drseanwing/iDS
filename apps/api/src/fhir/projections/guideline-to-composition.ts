import { Injectable } from '@nestjs/common';

/**
 * Projects an internal Guideline (with sections) to a FHIR R5 Composition resource.
 *
 * @see https://hl7.org/fhir/R5/composition.html
 */
@Injectable()
export class GuidelineCompositionProjection {
  toComposition(guideline: any): object {
    return {
      resourceType: 'Composition',
      id: guideline.id,
      meta: {
        profile: [
          'http://hl7.org/fhir/StructureDefinition/Composition',
        ],
      },
      status: this.mapStatus(guideline.status),
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '57024-2',
            display: 'Health Quality Measure Document',
          },
        ],
      },
      title: guideline.title,
      date: guideline.updatedAt?.toISOString?.() ?? guideline.updatedAt,
      identifier: guideline.shortName
        ? [{ system: 'urn:opengrade:guideline:slug', value: guideline.shortName }]
        : undefined,
      subject: guideline.description
        ? [{ display: guideline.description }]
        : undefined,
      section: this.mapSections(guideline.sections ?? []),
    };
  }

  private mapStatus(
    status: string,
  ): 'preliminary' | 'final' | 'amended' | 'entered-in-error' {
    switch (status) {
      case 'PUBLISHED':
        return 'final';
      case 'PUBLIC_CONSULTATION':
        return 'amended';
      case 'PUBLISHED_INTERNAL':
        return 'amended';
      default:
        return 'preliminary';
    }
  }

  private mapSections(sections: any[]): object[] {
    const roots = sections
      .filter((s: any) => !s.parentId && !s.isDeleted)
      .sort((a: any, b: any) => a.ordering - b.ordering);

    return roots.map((s: any) => this.mapSection(s, sections));
  }

  private mapSection(section: any, allSections: any[]): object {
    const children = allSections
      .filter((s: any) => s.parentId === section.id && !s.isDeleted)
      .sort((a: any, b: any) => a.ordering - b.ordering);

    const result: any = {
      title: section.title,
    };

    if (section.text) {
      result.text = {
        status: 'generated',
        div: typeof section.text === 'string'
          ? section.text
          : `<div xmlns="http://www.w3.org/1999/xhtml">${JSON.stringify(section.text)}</div>`,
      };
    }

    if (children.length > 0) {
      result.section = children.map((c: any) => this.mapSection(c, allSections));
    }

    return result;
  }
}
