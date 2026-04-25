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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { FhirEtagInterceptor } from './fhir-etag.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { GuidelineCompositionProjection } from './projections/guideline-to-composition';
import { ReferenceCitationProjection } from './projections/reference-to-citation';
import { RecommendationPlanDefinitionProjection } from './projections/recommendation-to-plan-definition';
import { PicoEvidenceProjection } from './projections/pico-to-evidence';
import { FhirValidationService } from './fhir-validation.service';
import { coiToProvenance } from './projections/coi-to-provenance';
import { activityToAuditEvent } from './projections/activity-to-audit-event';
import { Public } from '../auth/public.decorator';

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

  // ── CapabilityStatement ─────────────────────────────────────

  @Get('metadata')
  @Public()
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'FHIR R5 CapabilityStatement (server metadata)' })
  getMetadata() {
    return {
      resourceType: 'CapabilityStatement',
      name: 'OpenGRADECapabilityStatement',
      title: 'OpenGRADE FHIR Facade',
      status: 'active',
      date: new Date().toISOString(),
      kind: 'instance',
      software: { name: 'OpenGRADE', version: '1.0.0' },
      fhirVersion: '5.0.0',
      format: ['application/fhir+json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Composition',
              interaction: [{ code: 'read' }],
              searchParam: [{ name: '_id', type: 'token' }],
            },
            {
              type: 'Citation',
              interaction: [{ code: 'read' }, { code: 'search-type' }],
              searchParam: [
                { name: '_id', type: 'token' },
                { name: 'title:contains', type: 'string' },
              ],
            },
            {
              type: 'PlanDefinition',
              interaction: [{ code: 'read' }, { code: 'search-type' }],
              searchParam: [
                { name: '_id', type: 'token' },
                { name: 'status', type: 'token' },
                { name: 'title:contains', type: 'string' },
              ],
            },
            {
              type: 'Evidence',
              interaction: [{ code: 'read' }, { code: 'search-type' }],
              searchParam: [{ name: '_id', type: 'token' }],
            },
            {
              type: 'Bundle',
              interaction: [{ code: 'read' }],
            },
            {
              type: 'Provenance',
              interaction: [{ code: 'read' }],
            },
            {
              type: 'AuditEvent',
              interaction: [{ code: 'search-type' }],
              searchParam: [
                { name: 'entity', type: 'reference' },
                { name: 'date', type: 'date' },
              ],
            },
            {
              type: 'OperationDefinition',
              interaction: [{ code: 'read' }],
            },
          ],
        },
      ],
    };
  }

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

  // ── Citation (Reference) search-type ───────────────────────

  @Get('Citation')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'Search references as FHIR R5 Citation resources (searchset Bundle)' })
  @ApiQuery({ name: '_id', required: false, description: 'Filter by Reference UUID' })
  @ApiQuery({ name: 'title', required: false, description: 'Filter by title (case-insensitive contains)' })
  @ApiQuery({ name: '_count', required: false, description: 'Page size (default 20)' })
  @ApiQuery({ name: '_offset', required: false, description: 'Page offset (default 0)' })
  async searchCitation(
    @Req() req: Request,
    @Query('_id') id?: string,
    @Query('title') title?: string,
    @Query('_count') count = '20',
    @Query('_offset') offset = '0',
  ) {
    const take = Math.max(1, parseInt(count, 10) || 20);
    const skip = Math.max(0, parseInt(offset, 10) || 0);

    const where: any = { isDeleted: false };
    if (id) where.id = id;
    if (title) where.title = { contains: title, mode: 'insensitive' };

    const [references, total] = await Promise.all([
      this.prisma.reference.findMany({ where, take, skip }),
      this.prisma.reference.count({ where }),
    ]);

    const selfUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      link: [{ relation: 'self', url: selfUrl }],
      entry: references.map((ref) => ({
        fullUrl: `urn:uuid:${ref.id}`,
        resource: this.citationProjection.toCitation(ref),
      })),
    };
  }

  // ── Citation (Reference) read ───────────────────────────────

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

  // ── PlanDefinition (Recommendation) search-type ─────────────

  @Get('PlanDefinition')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'Search recommendations as FHIR R5 PlanDefinition resources (searchset Bundle)' })
  @ApiQuery({ name: '_id', required: false, description: 'Filter by Recommendation UUID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'title', required: false, description: 'Filter by title (case-insensitive contains)' })
  @ApiQuery({ name: '_count', required: false, description: 'Page size (default 20)' })
  @ApiQuery({ name: '_offset', required: false, description: 'Page offset (default 0)' })
  async searchPlanDefinition(
    @Req() req: Request,
    @Query('_id') id?: string,
    @Query('status') status?: string,
    @Query('title') title?: string,
    @Query('_count') count = '20',
    @Query('_offset') offset = '0',
  ) {
    const take = Math.max(1, parseInt(count, 10) || 20);
    const skip = Math.max(0, parseInt(offset, 10) || 0);

    const where: any = { isDeleted: false };
    if (id) where.id = id;
    if (status) where.recStatus = status;
    if (title) where.title = { contains: title, mode: 'insensitive' };

    const [recommendations, total] = await Promise.all([
      this.prisma.recommendation.findMany({ where, take, skip }),
      this.prisma.recommendation.count({ where }),
    ]);

    const selfUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      link: [{ relation: 'self', url: selfUrl }],
      entry: recommendations.map((rec) => ({
        fullUrl: `urn:uuid:${rec.id}`,
        resource: this.planDefinitionProjection.toPlanDefinition(rec),
      })),
    };
  }

  // ── PlanDefinition (Recommendation) read ────────────────────

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

  // ── Evidence (PICO) search-type ─────────────────────────────

  @Get('Evidence')
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'Search PICOs as FHIR R5 Evidence resources (searchset Bundle)' })
  @ApiQuery({ name: '_id', required: false, description: 'Filter by PICO UUID' })
  @ApiQuery({ name: '_count', required: false, description: 'Page size (default 20)' })
  @ApiQuery({ name: '_offset', required: false, description: 'Page offset (default 0)' })
  async searchEvidence(
    @Req() req: Request,
    @Query('_id') id?: string,
    @Query('_count') count = '20',
    @Query('_offset') offset = '0',
  ) {
    const take = Math.max(1, parseInt(count, 10) || 20);
    const skip = Math.max(0, parseInt(offset, 10) || 0);

    const where: any = { isDeleted: false };
    if (id) where.id = id;

    const [picos, total] = await Promise.all([
      this.prisma.pico.findMany({
        where,
        take,
        skip,
        include: { outcomes: true, codes: true },
      }),
      this.prisma.pico.count({ where }),
    ]);

    const selfUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      link: [{ relation: 'self', url: selfUrl }],
      entry: picos.map((pico) => ({
        fullUrl: `urn:uuid:${pico.id}`,
        resource: this.evidenceProjection.toEvidence(pico),
      })),
    };
  }

  // ── Evidence (PICO) read ─────────────────────────────────────

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
