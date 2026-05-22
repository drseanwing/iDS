import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkSectionReferenceDto } from './dto/link-section-reference.dto';
import { LinkSectionPicoDto } from './dto/link-section-pico.dto';
import { LinkSectionRecommendationDto } from './dto/link-section-recommendation.dto';
import { LinkPicoRecommendationDto } from './dto/link-pico-recommendation.dto';
import { LinkOutcomeReferenceDto } from './dto/link-outcome-reference.dto';

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertGuidelineOwnership(
    guidelineId: string,
    entityType: 'section' | 'pico' | 'recommendation' | 'outcome',
    entityId: string,
  ): Promise<void> {
    let actualGuidelineId: string | null = null;
    if (entityType === 'section') {
      const e = await this.prisma.section.findUnique({ where: { id: entityId }, select: { guidelineId: true } });
      actualGuidelineId = e?.guidelineId ?? null;
    } else if (entityType === 'pico') {
      const e = await this.prisma.pico.findUnique({ where: { id: entityId }, select: { guidelineId: true } });
      actualGuidelineId = e?.guidelineId ?? null;
    } else if (entityType === 'recommendation') {
      const e = await this.prisma.recommendation.findUnique({ where: { id: entityId }, select: { guidelineId: true } });
      actualGuidelineId = e?.guidelineId ?? null;
    } else if (entityType === 'outcome') {
      const e = await this.prisma.outcome.findUnique({
        where: { id: entityId },
        select: { pico: { select: { guidelineId: true } } },
      });
      actualGuidelineId = e?.pico?.guidelineId ?? null;
    }
    if (!actualGuidelineId || actualGuidelineId !== guidelineId) {
      throw new ForbiddenException('Entity does not belong to the specified guideline');
    }
  }

  // ── SectionReference ─────────────────────────────────────

  async linkSectionReference(dto: LinkSectionReferenceDto, guidelineId: string) {
    await this.assertGuidelineOwnership(guidelineId, 'section', dto.sectionId);
    return this.prisma.sectionReference.upsert({
      where: {
        sectionId_referenceId: {
          sectionId: dto.sectionId,
          referenceId: dto.referenceId,
        },
      },
      create: {
        sectionId: dto.sectionId,
        referenceId: dto.referenceId,
        ordering: dto.ordering ?? 0,
      },
      update: {
        ordering: dto.ordering ?? 0,
      },
    });
  }

  async unlinkSectionReference(sectionId: string, referenceId: string, guidelineId: string) {
    await this.assertGuidelineOwnership(guidelineId, 'section', sectionId);
    return this.prisma.sectionReference.deleteMany({
      where: { sectionId, referenceId },
    });
  }

  async listSectionReferences(sectionId: string) {
    return this.prisma.sectionReference.findMany({
      where: { sectionId },
      orderBy: { ordering: 'asc' },
      include: { reference: true },
    });
  }

  // ── SectionPico ──────────────────────────────────────────

  async linkSectionPico(dto: LinkSectionPicoDto, guidelineId: string) {
    await this.assertGuidelineOwnership(guidelineId, 'section', dto.sectionId);
    return this.prisma.sectionPico.upsert({
      where: {
        sectionId_picoId: {
          sectionId: dto.sectionId,
          picoId: dto.picoId,
        },
      },
      create: {
        sectionId: dto.sectionId,
        picoId: dto.picoId,
        ordering: dto.ordering ?? 0,
      },
      update: {
        ordering: dto.ordering ?? 0,
      },
    });
  }

  async unlinkSectionPico(sectionId: string, picoId: string, guidelineId: string) {
    await this.assertGuidelineOwnership(guidelineId, 'section', sectionId);
    return this.prisma.sectionPico.deleteMany({
      where: { sectionId, picoId },
    });
  }

  async listSectionPicos(sectionId: string) {
    return this.prisma.sectionPico.findMany({
      where: { sectionId },
      orderBy: { ordering: 'asc' },
      include: { pico: true },
    });
  }

  // ── SectionRecommendation ────────────────────────────────

  async linkSectionRecommendation(dto: LinkSectionRecommendationDto, guidelineId: string) {
    await this.assertGuidelineOwnership(guidelineId, 'section', dto.sectionId);
    return this.prisma.sectionRecommendation.upsert({
      where: {
        sectionId_recommendationId: {
          sectionId: dto.sectionId,
          recommendationId: dto.recommendationId,
        },
      },
      create: {
        sectionId: dto.sectionId,
        recommendationId: dto.recommendationId,
        ordering: dto.ordering ?? 0,
      },
      update: {
        ordering: dto.ordering ?? 0,
      },
    });
  }

  async unlinkSectionRecommendation(
    sectionId: string,
    recommendationId: string,
    guidelineId: string,
  ) {
    await this.assertGuidelineOwnership(guidelineId, 'section', sectionId);
    return this.prisma.sectionRecommendation.deleteMany({
      where: { sectionId, recommendationId },
    });
  }

  async listSectionRecommendations(sectionId: string) {
    return this.prisma.sectionRecommendation.findMany({
      where: { sectionId },
      orderBy: { ordering: 'asc' },
      include: { recommendation: true },
    });
  }

  // ── PicoRecommendation ───────────────────────────────────

  async linkPicoRecommendation(dto: LinkPicoRecommendationDto, guidelineId: string) {
    await this.assertGuidelineOwnership(guidelineId, 'pico', dto.picoId);
    return this.prisma.picoRecommendation.upsert({
      where: {
        picoId_recommendationId: {
          picoId: dto.picoId,
          recommendationId: dto.recommendationId,
        },
      },
      create: {
        picoId: dto.picoId,
        recommendationId: dto.recommendationId,
      },
      update: {},
    });
  }

  async unlinkPicoRecommendation(picoId: string, recommendationId: string, guidelineId: string) {
    await this.assertGuidelineOwnership(guidelineId, 'pico', picoId);
    return this.prisma.picoRecommendation.deleteMany({
      where: { picoId, recommendationId },
    });
  }

  async listPicoRecommendations(picoId: string) {
    return this.prisma.picoRecommendation.findMany({
      where: { picoId },
      include: { recommendation: true },
    });
  }

  // ── OutcomeReference ─────────────────────────────────────

  async linkOutcomeReference(dto: LinkOutcomeReferenceDto, guidelineId: string) {
    await this.assertGuidelineOwnership(guidelineId, 'outcome', dto.outcomeId);
    return this.prisma.outcomeReference.upsert({
      where: {
        outcomeId_referenceId: {
          outcomeId: dto.outcomeId,
          referenceId: dto.referenceId,
        },
      },
      create: {
        outcomeId: dto.outcomeId,
        referenceId: dto.referenceId,
      },
      update: {},
    });
  }

  async unlinkOutcomeReference(outcomeId: string, referenceId: string, guidelineId: string) {
    await this.assertGuidelineOwnership(guidelineId, 'outcome', outcomeId);
    return this.prisma.outcomeReference.deleteMany({
      where: { outcomeId, referenceId },
    });
  }

  async listOutcomeReferences(outcomeId: string) {
    return this.prisma.outcomeReference.findMany({
      where: { outcomeId },
      include: { reference: true },
    });
  }
}
