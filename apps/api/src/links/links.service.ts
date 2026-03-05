import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkSectionReferenceDto } from './dto/link-section-reference.dto';
import { LinkSectionPicoDto } from './dto/link-section-pico.dto';
import { LinkSectionRecommendationDto } from './dto/link-section-recommendation.dto';
import { LinkPicoRecommendationDto } from './dto/link-pico-recommendation.dto';
import { LinkOutcomeReferenceDto } from './dto/link-outcome-reference.dto';

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  // ── SectionReference ─────────────────────────────────────

  async linkSectionReference(dto: LinkSectionReferenceDto) {
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

  async unlinkSectionReference(sectionId: string, referenceId: string) {
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

  async linkSectionPico(dto: LinkSectionPicoDto) {
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

  async unlinkSectionPico(sectionId: string, picoId: string) {
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

  async linkSectionRecommendation(dto: LinkSectionRecommendationDto) {
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
  ) {
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

  async linkPicoRecommendation(dto: LinkPicoRecommendationDto) {
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

  async unlinkPicoRecommendation(picoId: string, recommendationId: string) {
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

  async linkOutcomeReference(dto: LinkOutcomeReferenceDto) {
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

  async unlinkOutcomeReference(outcomeId: string, referenceId: string) {
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
