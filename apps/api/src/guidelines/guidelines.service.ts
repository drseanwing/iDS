import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EtdMode, Prisma, GuidelineType, GuidelineRole, PicoDisplay } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateGuidelineDto } from './dto/create-guideline.dto';
import { UpdateGuidelineDto } from './dto/update-guideline.dto';

@Injectable()
export class GuidelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGuidelineDto, userId: string) {
    return this.prisma.guideline.create({
      data: {
        title: dto.title,
        shortName: dto.shortName,
        description: dto.description,
        organizationId: dto.organizationId,
        language: dto.language || 'en',
        guidelineType: (dto.guidelineType as GuidelineType) || GuidelineType.ORGANIZATIONAL,
        fhirMeta: (dto.fhirMeta ?? {}) as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
  }

  async findAll(filters?: { organizationId?: string; isDeleted?: boolean }, page = 1, limit = 20) {
    const where: any = {
      organizationId: filters?.organizationId,
    };
    if (filters?.isDeleted !== undefined) {
      where.isDeleted = filters.isDeleted;
    } else {
      where.isDeleted = false;
    }
    const [data, total] = await Promise.all([
      this.prisma.guideline.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.guideline.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id },
      include: {
        organization: true,
        sections: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
    });
    if (!guideline) {
      throw new NotFoundException(`Guideline ${id} not found`);
    }
    return guideline;
  }

  async findBySlug(shortName: string) {
    const guideline = await this.prisma.guideline.findFirst({
      where: {
        shortName: { equals: shortName, mode: 'insensitive' },
        isDeleted: false,
      },
      include: {
        organization: true,
        sections: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
    });
    if (!guideline) {
      throw new NotFoundException(`Guideline with slug '${shortName}' not found`);
    }
    return guideline;
  }

  async update(id: string, dto: UpdateGuidelineDto) {
    await this.findOne(id); // ensure exists
    const data: Prisma.GuidelineUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.shortName !== undefined) data.shortName = dto.shortName;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.guidelineType !== undefined) data.guidelineType = dto.guidelineType as GuidelineType;
    if (dto.etdMode !== undefined) data.etdMode = dto.etdMode as EtdMode;
    if (dto.showSectionNumbers !== undefined) data.showSectionNumbers = dto.showSectionNumbers;
    if (dto.showCertaintyInLabel !== undefined) data.showCertaintyInLabel = dto.showCertaintyInLabel;
    if (dto.showGradeDescription !== undefined) data.showGradeDescription = dto.showGradeDescription;
    if (dto.trackChangesDefault !== undefined) data.trackChangesDefault = dto.trackChangesDefault;
    if (dto.enableSubscriptions !== undefined) data.enableSubscriptions = dto.enableSubscriptions;
    if (dto.enablePublicComments !== undefined) data.enablePublicComments = dto.enablePublicComments;
    if (dto.showSectionTextPreview !== undefined) data.showSectionTextPreview = dto.showSectionTextPreview;
    if (dto.pdfColumnLayout !== undefined) data.pdfColumnLayout = dto.pdfColumnLayout;
    if (dto.picoDisplayMode !== undefined) data.picoDisplayMode = dto.picoDisplayMode as PicoDisplay;
    if (dto.coverPageUrl !== undefined) data.coverPageUrl = dto.coverPageUrl;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    if (dto.fhirMeta !== undefined) data.fhirMeta = dto.fhirMeta as Prisma.InputJsonValue;
    return this.prisma.guideline.update({
      where: { id },
      data,
    });
  }

  async getDashboardStats(organizationId?: string) {
    const guidelineWhere = { isDeleted: false, ...(organizationId ? { organizationId } : {}) };
    const [guidelines, sections, recommendations] = await Promise.all([
      this.prisma.guideline.count({ where: guidelineWhere }),
      this.prisma.section.count({
        where: {
          isDeleted: false,
          guideline: guidelineWhere,
        },
      }),
      this.prisma.recommendation.count({
        where: {
          isDeleted: false,
          guideline: guidelineWhere,
        },
      }),
    ]);
    return { guidelines, sections, recommendations };
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.guideline.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: string) {
    const guideline = await this.prisma.guideline.findUnique({ where: { id } });
    if (!guideline) {
      throw new NotFoundException(`Guideline ${id} not found`);
    }
    return this.prisma.guideline.update({
      where: { id },
      data: { isDeleted: false },
    });
  }

  async updateStatus(id: string, status: string) {
    const guideline = await this.findOne(id);
    const allowed = this.getAllowedTransitions(guideline.status);
    if (!allowed.includes(status as any)) {
      throw new BadRequestException(`Cannot transition from ${guideline.status} to ${status}`);
    }
    return this.prisma.guideline.update({
      where: { id },
      data: { status: status as any },
    });
  }

  // ── Permission management ──────────────────────────────────

  async addPermission(guidelineId: string, userId: string, role: string) {
    await this.findOne(guidelineId);
    return this.prisma.guidelinePermission.upsert({
      where: {
        guidelineId_userId: { guidelineId, userId },
      },
      update: { role: role as GuidelineRole },
      create: {
        guidelineId,
        userId,
        role: role as GuidelineRole,
      },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async removePermission(guidelineId: string, userId: string) {
    await this.findOne(guidelineId);
    const existing = await this.prisma.guidelinePermission.findUnique({
      where: {
        guidelineId_userId: { guidelineId, userId },
      },
    });
    if (!existing) {
      throw new NotFoundException(
        `Permission for user ${userId} on guideline ${guidelineId} not found`,
      );
    }
    return this.prisma.guidelinePermission.delete({
      where: {
        guidelineId_userId: { guidelineId, userId },
      },
    });
  }

  async findPermissions(guidelineId: string) {
    await this.findOne(guidelineId);
    return this.prisma.guidelinePermission.findMany({
      where: { guidelineId },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { role: 'asc' },
    });
  }

  async togglePublic(id: string, isPublic: boolean) {
    await this.findOne(id);
    if (isPublic) {
      const versionCount = await this.prisma.guidelineVersion.count({
        where: { guidelineId: id },
      });
      if (versionCount === 0) {
        throw new BadRequestException(
          'Cannot make guideline public before publishing at least one version',
        );
      }
    }
    return this.prisma.guideline.update({
      where: { id },
      data: { isPublic },
    });
  }

  async findUserPermission(guidelineId: string, userId: string) {
    await this.findOne(guidelineId);
    const permission = await this.prisma.guidelinePermission.findUnique({
      where: {
        guidelineId_userId: { guidelineId, userId },
      },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });
    if (!permission) {
      throw new NotFoundException(
        `Permission for user ${userId} on guideline ${guidelineId} not found`,
      );
    }
    return permission;
  }

  async exportJson(id: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        sections: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
          include: {
            children: {
              where: { isDeleted: false },
              orderBy: { ordering: 'asc' },
              include: {
                children: {
                  where: { isDeleted: false },
                  orderBy: { ordering: 'asc' },
                },
                sectionReferences: { orderBy: { ordering: 'asc' } },
                sectionPicos: { orderBy: { ordering: 'asc' } },
                sectionRecommendations: { orderBy: { ordering: 'asc' } },
              },
            },
            sectionReferences: { orderBy: { ordering: 'asc' } },
            sectionPicos: { orderBy: { ordering: 'asc' } },
            sectionRecommendations: { orderBy: { ordering: 'asc' } },
          },
        },
        recommendations: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
          include: {
            etdFactors: {
              orderBy: { ordering: 'asc' },
              include: {
                judgments: true,
              },
            },
            sectionPlacements: { orderBy: { ordering: 'asc' } },
            picoLinks: true,
            tags: true,
          },
        },
        picos: {
          where: { isDeleted: false },
          include: {
            outcomes: {
              where: { isDeleted: false },
              orderBy: { ordering: 'asc' },
              include: {
                referenceLinks: true,
              },
            },
            codes: true,
            practicalIssues: { orderBy: { ordering: 'asc' } },
          },
        },
        references: {
          where: { isDeleted: false },
          include: {
            sectionPlacements: { orderBy: { ordering: 'asc' } },
            outcomeLinks: true,
          },
        },
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
        versions: {
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            versionType: true,
            comment: true,
            isPublic: true,
            publishedAt: true,
            publishedBy: true,
          },
        },
      },
    });

    if (!guideline || guideline.isDeleted) {
      throw new NotFoundException(`Guideline ${id} not found`);
    }

    const g = guideline as any;
    const {
      isDeleted,
      organization,
      sections,
      recommendations,
      picos,
      references,
      permissions,
      versions,
      ...guidelineFields
    } = g;

    return {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      guideline: guidelineFields,
      organization: organization ?? null,
      sections: sections.map((s: any) => this.stripSectionInternal(s)),
      recommendations: recommendations.map((r: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, ...rest } = r;
        return rest;
      }),
      picos: picos.map((p: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, ...rest } = p;
        return {
          ...rest,
          outcomes: (p.outcomes ?? []).map((o: any) => {
            const { createdAt, updatedAt, isDeleted, ...oRest } = o;
            return oRest;
          }),
        };
      }),
      references: references.map((ref: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, ...rest } = ref;
        return rest;
      }),
      permissions: permissions.map((perm: any) => {
        const { guidelineId, ...rest } = perm;
        return rest;
      }),
      versions,
    };
  }

  async findClinicalCodes(guidelineId: string) {
    await this.findOne(guidelineId);
    const [picos, recommendations] = await Promise.all([
      this.prisma.pico.findMany({
        where: { guidelineId, isDeleted: false },
        include: { codes: true },
      }),
      this.prisma.recommendation.findMany({
        where: { guidelineId, isDeleted: false },
        include: { emrElements: true },
      }),
    ]);

    const picoCodes = picos.flatMap((p) =>
      p.codes.map((c) => ({ ...c, picoId: p.id })),
    );
    const emrElements = recommendations.flatMap((r) =>
      r.emrElements.map((e) => ({ ...e, recommendationId: r.id })),
    );

    return { picoCodes, emrElements };
  }

  private stripSectionInternal(section: any): any {
    const { guidelineId, createdAt, updatedAt, isDeleted, ...rest } = section;
    if (rest.children && Array.isArray(rest.children)) {
      rest.children = rest.children.map((c: any) => this.stripSectionInternal(c));
    }
    return rest;
  }

  async validate(guidelineId: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id: guidelineId },
    });
    if (!guideline || guideline.isDeleted) {
      throw new NotFoundException(`Guideline ${guidelineId} not found`);
    }

    const issues: { severity: 'error' | 'warning'; entity: string; entityId: string; message: string }[] = [];

    // 1. Check for orphan section-reference links (referencing deleted references)
    const sectionRefLinks = await this.prisma.sectionReference.findMany({
      where: { section: { guidelineId, isDeleted: false } },
      include: { reference: { select: { id: true, isDeleted: true } } },
    });
    for (const link of sectionRefLinks) {
      if (link.reference.isDeleted) {
        issues.push({
          severity: 'error',
          entity: 'SectionReference',
          entityId: `${link.sectionId}-${link.referenceId}`,
          message: `Section-reference link points to deleted reference ${link.referenceId}`,
        });
      }
    }

    // 2. Check for orphan recommendation-pico links
    const recPicoLinks = await this.prisma.picoRecommendation.findMany({
      where: { recommendation: { guidelineId, isDeleted: false } },
      include: {
        pico: { select: { id: true, isDeleted: true } },
        recommendation: { select: { id: true, isDeleted: true } },
      },
    });
    for (const link of recPicoLinks) {
      if (link.pico.isDeleted) {
        issues.push({
          severity: 'error',
          entity: 'PicoRecommendation',
          entityId: `${link.picoId}-${link.recommendationId}`,
          message: `Recommendation ${link.recommendationId} links to deleted PICO ${link.picoId}`,
        });
      }
    }

    // 3. Check for PICOs with no outcomes
    const picos = await this.prisma.pico.findMany({
      where: { guidelineId, isDeleted: false },
      include: { outcomes: { where: { isDeleted: false }, select: { id: true } } },
    });
    for (const pico of picos) {
      if (pico.outcomes.length === 0) {
        issues.push({
          severity: 'warning',
          entity: 'Pico',
          entityId: pico.id,
          message: `PICO "${pico.population} / ${pico.intervention}" has no outcomes`,
        });
      }
    }

    // 4. Check for outcomes without certainty assessment
    const outcomes = await this.prisma.outcome.findMany({
      where: { pico: { guidelineId, isDeleted: false }, isDeleted: false },
      select: { id: true, title: true, certaintyOverall: true },
    });
    for (const outcome of outcomes) {
      if (!outcome.certaintyOverall) {
        issues.push({
          severity: 'warning',
          entity: 'Outcome',
          entityId: outcome.id,
          message: `Outcome "${outcome.title}" has no certainty assessment`,
        });
      }
    }

    // 5. Check for recommendations without section placement
    const recs = await this.prisma.recommendation.findMany({
      where: { guidelineId, isDeleted: false },
      include: { sectionPlacements: { select: { sectionId: true } } },
    });
    for (const rec of recs) {
      if ((rec as any).sectionPlacements.length === 0) {
        issues.push({
          severity: 'warning',
          entity: 'Recommendation',
          entityId: rec.id,
          message: `Recommendation "${rec.title}" is not placed in any section`,
        });
      }
    }

    return {
      guidelineId,
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      errorCount: issues.filter((i) => i.severity === 'error').length,
      warningCount: issues.filter((i) => i.severity === 'warning').length,
      issues,
    };
  }

  async importGuideline(exportData: any, organizationId: string, userId: string) {
    const src = exportData?.guideline ?? exportData;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the new guideline
      const guideline = await tx.guideline.create({
        data: {
          title: `${src.title ?? 'Untitled'} (Imported)`,
          shortName: undefined, // avoid unique constraint clash — let caller update after
          description: src.description ?? null,
          language: src.language ?? 'en',
          guidelineType: src.guidelineType ?? 'ORGANIZATIONAL',
          organizationId,
          createdBy: userId,
          fhirMeta: (src.fhirMeta ?? {}) as any,
        },
      });

      // 2. Build a map from old section id → new section id to preserve parent-child
      const sectionIdMap = new Map<string, string>();

      const rawSections: any[] = exportData?.sections ?? [];
      // Sort: parents first (no parentId or parentId not in the set yet)
      const sorted = this.topologicallySortSections(rawSections);

      for (const s of sorted) {
        const newParentId = s.parentId ? sectionIdMap.get(s.parentId) : null;
        const created = await tx.section.create({
          data: {
            guidelineId: guideline.id,
            title: s.title ?? '',
            text: s.text ?? null,
            ordering: s.ordering ?? 0,
            nestingLevel: s.nestingLevel ?? 0,
            parentId: newParentId ?? null,
          },
        });
        sectionIdMap.set(s.id, created.id);
      }

      // 3. Create references
      const rawRefs: any[] = exportData?.references ?? [];
      for (const ref of rawRefs) {
        await tx.reference.create({
          data: {
            guidelineId: guideline.id,
            title: ref.title ?? '',
            authors: ref.authors ?? null,
            year: ref.year ?? null,
            abstract: ref.abstract ?? null,
            doi: ref.doi ?? null,
            pubmedId: ref.pubmedId ?? ref.pmid ?? null,
            url: ref.url ?? null,
            studyType: ref.studyType ?? 'OTHER',
          },
        });
      }

      return guideline;
    });
  }

  async clone(id: string, userId: string) {
    // 1. Fetch source guideline with all nested data
    const source = await this.prisma.guideline.findUnique({
      where: { id },
      include: {
        sections: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
          include: {
            sectionReferences: { orderBy: { ordering: 'asc' } },
            sectionPicos: { orderBy: { ordering: 'asc' } },
            sectionRecommendations: { orderBy: { ordering: 'asc' } },
          },
        },
        references: {
          where: { isDeleted: false },
        },
        recommendations: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
          include: {
            etdFactors: {
              orderBy: { ordering: 'asc' },
              include: { judgments: true },
            },
            picoLinks: true,
          },
        },
        picos: {
          where: { isDeleted: false },
          include: {
            outcomes: {
              where: { isDeleted: false },
              orderBy: { ordering: 'asc' },
              include: { referenceLinks: true },
            },
            codes: true,
            practicalIssues: { orderBy: { ordering: 'asc' } },
            sectionPlacements: true,
            recommendationLinks: true,
          },
        },
      },
    });

    if (!source || source.isDeleted) {
      throw new NotFoundException(`Guideline ${id} not found`);
    }

    // 2. Determine a unique shortName
    const uniqueShortName = await this.generateUniqueShortName(source.shortName ?? null);

    return this.prisma.$transaction(async (tx) => {
      // 3. Create the new guideline
      const newGuideline = await tx.guideline.create({
        data: {
          title: `COPY OF ${source.title}`,
          shortName: uniqueShortName,
          description: source.description,
          disclaimer: source.disclaimer,
          funding: source.funding,
          contactName: source.contactName,
          contactEmail: source.contactEmail,
          language: source.language,
          guidelineType: source.guidelineType,
          organizationId: source.organizationId,
          etdMode: source.etdMode,
          showSectionNumbers: source.showSectionNumbers,
          showCertaintyInLabel: source.showCertaintyInLabel,
          showGradeDescription: source.showGradeDescription,
          trackChangesDefault: source.trackChangesDefault,
          enableSubscriptions: source.enableSubscriptions,
          enablePublicComments: source.enablePublicComments,
          showSectionTextPreview: source.showSectionTextPreview,
          pdfColumnLayout: source.pdfColumnLayout,
          picoDisplayMode: source.picoDisplayMode,
          coverPageUrl: source.coverPageUrl,
          isPublic: false,
          fhirMeta: source.fhirMeta as Prisma.InputJsonValue,
          createdBy: userId,
          // status defaults to DRAFT; versions are NOT copied
        },
      });

      // 4. Deep-copy sections, preserving the parent/child tree
      const sectionIdMap = new Map<string, string>();
      const sortedSections = this.topologicallySortSections(source.sections as any[]);

      for (const s of sortedSections) {
        const newParentId = s.parentId ? (sectionIdMap.get(s.parentId) ?? null) : null;
        const newSection = await tx.section.create({
          data: {
            guidelineId: newGuideline.id,
            title: s.title,
            text: s.text as Prisma.InputJsonValue ?? Prisma.JsonNull,
            ordering: s.ordering,
            nestingLevel: s.nestingLevel,
            excludeFromNumbering: s.excludeFromNumbering,
            parentId: newParentId,
          },
        });
        sectionIdMap.set(s.id, newSection.id);
      }

      // 5. Deep-copy references (oldRefId → newRefId)
      const refIdMap = new Map<string, string>();
      for (const ref of source.references) {
        const newRef = await tx.reference.create({
          data: {
            guidelineId: newGuideline.id,
            title: ref.title,
            authors: ref.authors,
            year: ref.year,
            abstract: ref.abstract,
            pubmedId: ref.pubmedId,
            doi: ref.doi,
            url: ref.url,
            studyType: ref.studyType,
            fhirMeta: ref.fhirMeta as Prisma.InputJsonValue,
          },
        });
        refIdMap.set(ref.id, newRef.id);
      }

      // 6. Deep-copy recommendations (oldRecId → newRecId)
      const recIdMap = new Map<string, string>();
      for (const rec of source.recommendations) {
        const newRec = await tx.recommendation.create({
          data: {
            guidelineId: newGuideline.id,
            title: rec.title,
            description: rec.description as Prisma.InputJsonValue,
            strength: rec.strength,
            recommendationType: rec.recommendationType,
            header: rec.header,
            remark: rec.remark as Prisma.InputJsonValue ?? Prisma.JsonNull,
            rationale: rec.rationale as Prisma.InputJsonValue ?? Prisma.JsonNull,
            practicalInfo: rec.practicalInfo as Prisma.InputJsonValue ?? Prisma.JsonNull,
            recStatus: rec.recStatus,
            certaintyOfEvidence: rec.certaintyOfEvidence,
            ordering: rec.ordering,
            isHidden: rec.isHidden,
            fhirMeta: rec.fhirMeta as Prisma.InputJsonValue,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        recIdMap.set(rec.id, newRec.id);

        // Copy EtdFactors and their judgments
        for (const factor of (rec as any).etdFactors ?? []) {
          const newFactor = await tx.etdFactor.create({
            data: {
              recommendationId: newRec.id,
              factorType: factor.factorType,
              ordering: factor.ordering,
              summaryText: factor.summaryText as Prisma.InputJsonValue ?? Prisma.JsonNull,
              researchEvidence: factor.researchEvidence as Prisma.InputJsonValue ?? Prisma.JsonNull,
              additionalConsiderations: factor.additionalConsiderations as Prisma.InputJsonValue ?? Prisma.JsonNull,
              summaryPublic: factor.summaryPublic,
              evidencePublic: factor.evidencePublic,
              considerationsPublic: factor.considerationsPublic,
            },
          });
          for (const judgment of factor.judgments ?? []) {
            await tx.etdJudgment.create({
              data: {
                etdFactorId: newFactor.id,
                interventionLabel: judgment.interventionLabel,
                judgment: judgment.judgment,
                colorCode: judgment.colorCode,
              },
            });
          }
        }
      }

      // 7. Deep-copy PICOs (oldPicoId → newPicoId)
      const picoIdMap = new Map<string, string>();
      for (const pico of source.picos) {
        const newPico = await tx.pico.create({
          data: {
            guidelineId: newGuideline.id,
            population: pico.population,
            intervention: pico.intervention,
            comparator: pico.comparator,
            narrativeSummary: pico.narrativeSummary as Prisma.InputJsonValue ?? Prisma.JsonNull,
            fhirMeta: pico.fhirMeta as Prisma.InputJsonValue,
            importSource: pico.importSource,
          },
        });
        picoIdMap.set(pico.id, newPico.id);

        // Copy PicoCodes
        for (const code of (pico as any).codes ?? []) {
          await tx.picoCode.create({
            data: {
              picoId: newPico.id,
              codeSystem: code.codeSystem,
              code: code.code,
              display: code.display,
              element: code.element,
            },
          });
        }

        // Copy PracticalIssues
        for (const issue of (pico as any).practicalIssues ?? []) {
          await tx.practicalIssue.create({
            data: {
              picoId: newPico.id,
              category: issue.category,
              title: issue.title,
              description: issue.description as Prisma.InputJsonValue ?? Prisma.JsonNull,
              ordering: issue.ordering,
            },
          });
        }

        // Copy Outcomes (including outcome→reference links)
        const outcomeIdMap = new Map<string, string>();
        for (const outcome of (pico as any).outcomes ?? []) {
          const newOutcome = await tx.outcome.create({
            data: {
              picoId: newPico.id,
              title: outcome.title,
              outcomeType: outcome.outcomeType,
              state: outcome.state,
              ordering: outcome.ordering,
              importance: outcome.importance,
              effectMeasure: outcome.effectMeasure,
              relativeEffect: outcome.relativeEffect,
              relativeEffectLower: outcome.relativeEffectLower,
              relativeEffectUpper: outcome.relativeEffectUpper,
              baselineRisk: outcome.baselineRisk,
              absoluteEffectIntervention: outcome.absoluteEffectIntervention,
              absoluteEffectComparison: outcome.absoluteEffectComparison,
              interventionParticipants: outcome.interventionParticipants,
              comparisonParticipants: outcome.comparisonParticipants,
              numberOfStudies: outcome.numberOfStudies,
              continuousUnit: outcome.continuousUnit,
              continuousScaleLower: outcome.continuousScaleLower,
              continuousScaleUpper: outcome.continuousScaleUpper,
              certaintyOverall: outcome.certaintyOverall,
              riskOfBias: outcome.riskOfBias,
              inconsistency: outcome.inconsistency,
              indirectness: outcome.indirectness,
              imprecision: outcome.imprecision,
              publicationBias: outcome.publicationBias,
              largeEffect: outcome.largeEffect,
              doseResponse: outcome.doseResponse,
              plausibleConfounding: outcome.plausibleConfounding,
              gradeFootnotes: outcome.gradeFootnotes as Prisma.InputJsonValue ?? Prisma.JsonNull,
              plainLanguageSummary: outcome.plainLanguageSummary,
              isShadow: false, // shadow relationships are not carried over
            },
          });
          outcomeIdMap.set(outcome.id, newOutcome.id);

          // Copy OutcomeReference links (using new reference IDs)
          for (const link of outcome.referenceLinks ?? []) {
            const newRefId = refIdMap.get(link.referenceId);
            if (newRefId) {
              await tx.outcomeReference.create({
                data: { outcomeId: newOutcome.id, referenceId: newRefId },
              });
            }
          }
        }
      }

      // 8. Copy join-table rows (SectionReference, SectionPico, SectionRecommendation)
      //    using the new IDs from the maps built above
      for (const s of source.sections) {
        const newSectionId = sectionIdMap.get(s.id);
        if (!newSectionId) continue;

        for (const sr of (s as any).sectionReferences ?? []) {
          const newRefId = refIdMap.get(sr.referenceId);
          if (newRefId) {
            await tx.sectionReference.create({
              data: { sectionId: newSectionId, referenceId: newRefId, ordering: sr.ordering },
            });
          }
        }

        for (const sp of (s as any).sectionPicos ?? []) {
          const newPicoId = picoIdMap.get(sp.picoId);
          if (newPicoId) {
            await tx.sectionPico.create({
              data: { sectionId: newSectionId, picoId: newPicoId, ordering: sp.ordering },
            });
          }
        }

        for (const srec of (s as any).sectionRecommendations ?? []) {
          const newRecId = recIdMap.get(srec.recommendationId);
          if (newRecId) {
            await tx.sectionRecommendation.create({
              data: { sectionId: newSectionId, recommendationId: newRecId, ordering: srec.ordering },
            });
          }
        }
      }

      // 9. Copy PicoRecommendation links
      for (const rec of source.recommendations) {
        const newRecId = recIdMap.get(rec.id);
        if (!newRecId) continue;
        for (const link of (rec as any).picoLinks ?? []) {
          const newPicoId = picoIdMap.get(link.picoId);
          if (newPicoId) {
            await tx.picoRecommendation.create({
              data: { picoId: newPicoId, recommendationId: newRecId },
            });
          }
        }
      }

      // 10. Add GuidelinePermission for the cloning user as ADMIN
      await tx.guidelinePermission.create({
        data: {
          guidelineId: newGuideline.id,
          userId,
          role: GuidelineRole.ADMIN,
        },
      });

      return newGuideline;
    });
  }

  private async generateUniqueShortName(originalShortName: string | null): Promise<string | undefined> {
    if (!originalShortName) return undefined;

    const base = `${originalShortName}-copy`;

    // Check if `base` is available
    const existing = await this.prisma.guideline.findFirst({
      where: { shortName: base },
      select: { id: true },
    });
    if (!existing) return base;

    // Try `-copy-2` through `-copy-10`
    for (let i = 2; i <= 10; i++) {
      const candidate = `${originalShortName}-copy-${i}`;
      const taken = await this.prisma.guideline.findFirst({
        where: { shortName: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }

    // Fallback: append a timestamp suffix
    return `${originalShortName}-copy-${Date.now()}`;
  }

  private topologicallySortSections(sections: any[]): any[] {
    const ids = new Set(sections.map((s) => s.id));
    const result: any[] = [];
    const visited = new Set<string>();

    const visit = (s: any) => {
      if (visited.has(s.id)) return;
      if (s.parentId && ids.has(s.parentId) && !visited.has(s.parentId)) {
        const parent = sections.find((x) => x.id === s.parentId);
        if (parent) visit(parent);
      }
      visited.add(s.id);
      result.push(s);
    };

    for (const s of sections) {
      visit(s);
    }

    return result;
  }

  async findReferenceDuplicates(guidelineId: string) {
    const refs = await this.prisma.reference.findMany({
      where: { guidelineId, isDeleted: false },
      select: { id: true, title: true, authors: true, year: true, doi: true, pubmedId: true },
    });

    type RefItem = typeof refs[number];
    type DuplicateGroup =
      | { reason: 'DUPLICATE_DOI'; references: RefItem[] }
      | { reason: 'DUPLICATE_PMID'; references: RefItem[] }
      | { reason: 'SIMILAR_TITLE'; similarity: number; references: RefItem[] };

    const groups: DuplicateGroup[] = [];

    // 1. DOI duplicates
    const byDoi = new Map<string, RefItem[]>();
    for (const r of refs) {
      if (!r.doi) continue;
      const key = r.doi.toLowerCase().trim();
      if (!byDoi.has(key)) byDoi.set(key, []);
      byDoi.get(key)!.push(r);
    }
    for (const [, group] of byDoi) {
      if (group.length > 1) groups.push({ reason: 'DUPLICATE_DOI', references: group });
    }

    // 2. PMID duplicates
    const byPmid = new Map<string, RefItem[]>();
    for (const r of refs) {
      if (!r.pubmedId) continue;
      if (!byPmid.has(r.pubmedId)) byPmid.set(r.pubmedId, []);
      byPmid.get(r.pubmedId)!.push(r);
    }
    for (const [, group] of byPmid) {
      if (group.length > 1) groups.push({ reason: 'DUPLICATE_PMID', references: group });
    }

    // 3. Title similarity — Jaccard on word sets
    const tokenize = (s: string) =>
      new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
    const jaccard = (a: Set<string>, b: Set<string>) => {
      const inter = new Set([...a].filter((x) => b.has(x)));
      const union = new Set([...a, ...b]);
      return union.size === 0 ? 0 : inter.size / union.size;
    };

    const seen = new Set<string>();
    for (let i = 0; i < refs.length; i++) {
      for (let j = i + 1; j < refs.length; j++) {
        const pairKey = [refs[i].id, refs[j].id].sort().join(':');
        if (seen.has(pairKey)) continue;
        const sim = jaccard(tokenize(refs[i].title), tokenize(refs[j].title));
        if (sim >= 0.6) {
          seen.add(pairKey);
          groups.push({
            reason: 'SIMILAR_TITLE',
            similarity: Math.round(sim * 100) / 100,
            references: [refs[i], refs[j]],
          });
        }
      }
    }

    return { groups };
  }

  private getAllowedTransitions(current: string): string[] {
    const transitions: Record<string, string[]> = {
      DRAFT: ['DRAFT_INTERNAL', 'PUBLIC_CONSULTATION'],
      DRAFT_INTERNAL: ['DRAFT', 'PUBLISHED_INTERNAL', 'PUBLIC_CONSULTATION'],
      PUBLISHED_INTERNAL: ['DRAFT_INTERNAL', 'PUBLIC_CONSULTATION', 'PUBLISHED'],
      PUBLIC_CONSULTATION: ['DRAFT_INTERNAL', 'PUBLISHED_INTERNAL', 'PUBLISHED'],
      PUBLISHED: ['DRAFT'],
    };
    return transitions[current] ?? [];
  }
}
