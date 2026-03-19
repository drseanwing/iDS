import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { EtdService } from './etd.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { UpdateRecommendationStatusDto } from './dto/update-recommendation-status.dto';
import { UpdateEtdFactorDto } from './dto/update-etd-factor.dto';
import { UpdateEtdJudgmentDto } from './dto/update-etd-judgment.dto';
import { CreateEtdJudgmentDto } from './dto/create-etd-judgment.dto';
import { CreateEmrElementDto } from './dto/create-emr-element.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly etdService: EtdService,
  ) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Create a recommendation',
    description:
      'Creates a new clinical recommendation within a guideline. Recommendations represent the actionable clinical advice (e.g. "We recommend...") and are graded using the GRADE methodology.',
  })
  @ApiResponse({ status: 201, description: 'Recommendation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Parent guideline not found' })
  create(@Body() dto: CreateRecommendationDto, @Req() req: any) {
    return this.recommendationsService.create(dto, req.user?.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'List recommendations by guideline',
    description: 'Returns all recommendations belonging to the specified guideline, ordered by creation date.',
  })
  @ApiQuery({ name: 'guidelineId', required: true, description: 'Guideline UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results per page' })
  @ApiResponse({ status: 200, description: 'Recommendations returned successfully' })
  @ApiResponse({ status: 400, description: 'guidelineId is not a valid UUID' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.recommendationsService.findByGuideline(guidelineId, pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get recommendation by ID',
    description: 'Returns the full record for a single recommendation including its GRADE strength, direction, and linked evidence.',
  })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 200, description: 'Recommendation returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationsService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Update recommendation',
    description: 'Updates the text, GRADE rating, direction, and other fields of a recommendation.',
  })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 200, description: 'Recommendation updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecommendationDto,
    @Req() req: any,
  ) {
    return this.recommendationsService.update(id, dto, req.user?.sub);
  }

  @Put(':id/status')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Update recommendation status',
    description: 'Transitions the recommendation through its review workflow: DRAFT → UNDER_REVIEW → APPROVED → PUBLISHED.',
  })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status value or disallowed transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecommendationStatusDto,
    @Req() req: any,
  ) {
    return this.recommendationsService.updateStatus(id, dto, req.user?.sub ?? 'system');
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Soft-delete recommendation',
    description: 'Marks the recommendation as deleted without permanently removing it. It can be restored by an authorized user.',
  })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 200, description: 'Recommendation soft-deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationsService.softDelete(id);
  }

  // ── EMR Element endpoints ─────────────────────────────────────────────────

  @Post(':id/emr-elements')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Add an EMR element to a recommendation',
    description:
      'Attaches a structured electronic medical record (EMR) actionable element (e.g. a lab order, medication, or referral) to a recommendation to support clinical decision support integration.',
  })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 201, description: 'EMR element added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  addEmrElement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEmrElementDto,
  ) {
    return this.recommendationsService.addEmrElement(id, dto);
  }

  @Get(':id/emr-elements')
  @ApiOperation({
    summary: 'List EMR elements for a recommendation',
    description: 'Returns all structured EMR actionable elements attached to the given recommendation.',
  })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 200, description: 'EMR elements returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  findEmrElements(@Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationsService.findEmrElements(id);
  }

  @Delete(':id/emr-elements/:elementId')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Remove an EMR element from a recommendation',
    description: 'Permanently detaches the specified EMR element from the recommendation.',
  })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiParam({ name: 'elementId', description: 'EMR element UUID' })
  @ApiResponse({ status: 200, description: 'EMR element removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Recommendation or EMR element not found' })
  removeEmrElement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('elementId', ParseUUIDPipe) elementId: string,
  ) {
    return this.recommendationsService.removeEmrElement(id, elementId);
  }

  // ── Decision Aid endpoint ─────────────────────────────────────────────────

  @Get(':id/decision-aid')
  @ApiOperation({
    summary: 'Get auto-generated decision aid data for a recommendation',
    description:
      'Returns a structured decision aid object derived from the recommendation\'s PICO evidence, outcome data, and EtD judgments — ready to be rendered in a patient-facing decision aid tool.',
  })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 200, description: 'Decision aid data returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  getDecisionAid(@Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationsService.getDecisionAid(id);
  }

  // ── EtD endpoints ────────────────────────────────────────────────────────

  @Get(':id/etd')
  @ApiOperation({
    summary: 'Get or initialize EtD factors + judgments for a recommendation',
    description:
      'Returns the Evidence-to-Decision (EtD) framework data for this recommendation. If no EtD record exists yet, it is initialized with default factors (problem priority, desirable effects, undesirable effects, certainty of evidence, etc.).',
  })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 200, description: 'EtD framework data returned (or freshly initialized)' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  getEtd(@Param('id', ParseUUIDPipe) id: string) {
    return this.etdService.getOrInit(id);
  }
}

@ApiTags('EtD Factors')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('etd-factors')
export class EtdFactorsController {
  constructor(private readonly etdService: EtdService) {}

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Update EtD factor content and visibility',
    description: 'Updates the narrative content and display visibility of an Evidence-to-Decision (EtD) factor (e.g. "Certainty of evidence", "Cost-effectiveness").',
  })
  @ApiParam({ name: 'id', description: 'EtD factor UUID' })
  @ApiResponse({ status: 200, description: 'EtD factor updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'EtD factor not found' })
  updateFactor(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEtdFactorDto) {
    return this.etdService.updateFactor(id, dto);
  }

  @Post(':id/judgments')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Add an intervention judgment to an EtD factor',
    description: 'Records a panel judgment for a specific intervention on an EtD factor, including the judgment value (e.g. "favors intervention") and supporting rationale.',
  })
  @ApiParam({ name: 'id', description: 'EtD factor UUID' })
  @ApiResponse({ status: 201, description: 'Judgment added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'EtD factor not found' })
  addJudgment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateEtdJudgmentDto) {
    return this.etdService.addJudgment(id, dto);
  }
}

@ApiTags('EtD Judgments')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('etd-judgments')
export class EtdJudgmentsController {
  constructor(private readonly etdService: EtdService) {}

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Update an EtD judgment value and color',
    description: 'Updates the judgment value (e.g. "favors intervention", "no preference") and optional color coding for an EtD judgment entry.',
  })
  @ApiParam({ name: 'id', description: 'EtD judgment UUID' })
  @ApiResponse({ status: 200, description: 'EtD judgment updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'EtD judgment not found' })
  updateJudgment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEtdJudgmentDto) {
    return this.etdService.updateJudgment(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Delete an EtD judgment (remove intervention from factor)',
    description: 'Permanently removes a judgment entry, effectively withdrawing the intervention\'s assessment on that EtD factor.',
  })
  @ApiParam({ name: 'id', description: 'EtD judgment UUID' })
  @ApiResponse({ status: 200, description: 'EtD judgment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'EtD judgment not found' })
  deleteJudgment(@Param('id', ParseUUIDPipe) id: string) {
    return this.etdService.deleteJudgment(id);
  }
}
