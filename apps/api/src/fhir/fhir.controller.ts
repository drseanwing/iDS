import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  NotFoundException,
  Header,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { FhirEtagInterceptor } from './fhir-etag.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { GuidelineCompositionProjection } from './projections/guideline-to-composition';
import { ReferenceCitationProjection } from './projections/reference-to-citation';
import { RecommendationPlanDefinitionProjection } from './projections/recommendation-to-plan-definition';
import { PicoEvidenceProjection } from './projections/pico-to-evidence';
import { FhirValidationService } from './fhir-validation.service';
import { coiToProvenance } from './projections/coi-to-provenance';
import { activityToAuditEvent } from './projections/activity-to-audit-event';

/**
 * Read-only FHIR R5 facade.
 *
 * Projects internal domain models to FHIR resources for interoperability.
 * All endpoints return `application/fhir+json`.
 */
@ApiTags('FHIR')
@UseInterceptors(FhirEtagInterceptor)
@Controller('fhir')
export class FhirController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compositionProjection: GuidelineCompositionProjection,
    private readonly citationProjection: ReferenceCitationProjection,
    private readonly planDefinitionProjection: RecommendationPlanDefinitionProjection,
    private readonly evidenceProjection: PicoEvidenceProjection,
    private readonly fhirValidation: FhirValidationService,
  ) {}

  // ── Validation ──────────────────────────────────────────────

  @Post('$validate')
  @ApiOperation({ summary: 'Validate a FHIR R5 resource' })
  @ApiBody({ schema: { type: 'object', description: 'Any FHIR R5 resource object' } })
  validateResource(@Body() resource: any) {
    return this.fhirValidation.validate(resource);
  }

  // ── Composition (Guideline) ─────────────────────────────────

  @Get('Composition/:id')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'Get guideline as FHIR R5 Composition' })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  async getComposition(@Param('id', ParseUUIDPipe) id: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id },
      include: { sections: true },
    });

    if (!guideline || guideline.isDeleted) {
      throw new NotFoundException(`Guideline ${id} not found`);
    }

    return this.compositionProjection.toComposition(guideline);
  }

  // ── Citation (Reference) ────────────────────────────────────

  @Get('Citation/:id')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'Get reference as FHIR R5 Citation' })
  @ApiParam({ name: 'id', description: 'Reference UUID' })
  async getCitation(@Param('id', ParseUUIDPipe) id: string) {
    const reference = await this.prisma.reference.findUnique({
      where: { id },
    });

    if (!reference || reference.isDeleted) {
      throw new NotFoundException(`Reference ${id} not found`);
    }

    return this.citationProjection.toCitation(reference);
  }

  // ── PlanDefinition (Recommendation) ─────────────────────────

  @Get('PlanDefinition/:id')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'Get recommendation as FHIR R5 PlanDefinition' })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  async getPlanDefinition(@Param('id', ParseUUIDPipe) id: string) {
    const recommendation = await this.prisma.recommendation.findUnique({
      where: { id },
    });

    if (!recommendation || recommendation.isDeleted) {
      throw new NotFoundException(`Recommendation ${id} not found`);
    }

    return this.planDefinitionProjection.toPlanDefinition(recommendation);
  }

  // ── Evidence (PICO) ─────────────────────────────────────────

  @Get('Evidence/:id')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'Get PICO as FHIR R5 Evidence' })
  @ApiParam({ name: 'id', description: 'PICO UUID' })
  async getEvidence(@Param('id', ParseUUIDPipe) id: string) {
    const pico = await this.prisma.pico.findUnique({
      where: { id },
      include: {
        outcomes: true,
        codes: true,
      },
    });

    if (!pico || pico.isDeleted) {
      throw new NotFoundException(`PICO ${id} not found`);
    }

    return this.evidenceProjection.toEvidence(pico);
  }

  // ── Bundle (complete guideline) ─────────────────────────────

  @Get('Bundle/:guidelineId')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({
    summary: 'Get complete guideline as FHIR R5 Bundle (document type)',
  })
  @ApiParam({ name: 'guidelineId', description: 'Guideline UUID' })
  async getBundle(@Param('guidelineId', ParseUUIDPipe) guidelineId: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id: guidelineId },
      include: {
        sections: true,
        references: true,
        recommendations: true,
        picos: {
          include: {
            outcomes: true,
            codes: true,
          },
        },
      },
    });

    if (!guideline || guideline.isDeleted) {
      throw new NotFoundException(`Guideline ${guidelineId} not found`);
    }

    // Build entries
    const entries: object[] = [];

    // 1. Composition (the guideline itself) — must be first in a document bundle
    const composition = this.compositionProjection.toComposition(guideline);
    entries.push({
      fullUrl: `urn:uuid:${guideline.id}`,
      resource: composition,
    });

    // 2. Citations (references)
    for (const ref of guideline.references.filter((r: any) => !r.isDeleted)) {
      entries.push({
        fullUrl: `urn:uuid:${ref.id}`,
        resource: this.citationProjection.toCitation(ref),
      });
    }

    // 3. PlanDefinitions (recommendations)
    for (const rec of guideline.recommendations.filter(
      (r: any) => !r.isDeleted,
    )) {
      entries.push({
        fullUrl: `urn:uuid:${rec.id}`,
        resource: this.planDefinitionProjection.toPlanDefinition(rec),
      });
    }

    // 4. Evidence (PICOs)
    for (const pico of guideline.picos.filter((p: any) => !p.isDeleted)) {
      entries.push({
        fullUrl: `urn:uuid:${pico.id}`,
        resource: this.evidenceProjection.toEvidence(pico),
      });
    }

    return {
      resourceType: 'Bundle',
      id: guidelineId,
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
      },
      type: 'document',
      timestamp: guideline.updatedAt?.toISOString?.() ?? guideline.updatedAt,
      entry: entries,
    };
  }

  // ── Provenance (COI Record) ─────────────────────────────────

  @Get('Provenance/:id')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'Get COI record as FHIR R5 Provenance' })
  @ApiParam({ name: 'id', description: 'COI Record UUID' })
  async getProvenance(@Param('id', ParseUUIDPipe) id: string) {
    const record = await this.prisma.coiRecord.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        interventionConflicts: true,
      },
    });

    if (!record) {
      throw new NotFoundException(`COI record ${id} not found`);
    }

    return coiToProvenance(record);
  }

  // ── AuditEvent (Activity Log) ───────────────────────────────

  @Get('AuditEvent')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'List activity log entries as FHIR R5 AuditEvent Bundle' })
  @ApiQuery({ name: 'guidelineId', required: false, description: 'Filter by Guideline UUID' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by User UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results (default 50, max 200)' })
  async listAuditEvents(
    @Query('guidelineId') guidelineId?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit = '50',
  ) {
    const entries = await this.prisma.activityLogEntry.findMany({
      where: {
        ...(guidelineId ? { guidelineId } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(parseInt(limit, 10), 200),
    });

    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: entries.length,
      entry: entries.map((e) => ({ resource: activityToAuditEvent(e) })),
    };
  }
}
