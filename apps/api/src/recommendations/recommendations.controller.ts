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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { EtdService } from './etd.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { UpdateRecommendationStatusDto } from './dto/update-recommendation-status.dto';
import { UpdateEtdFactorDto } from './dto/update-etd-factor.dto';
import { UpdateEtdJudgmentDto } from './dto/update-etd-judgment.dto';
import { CreateEtdJudgmentDto } from './dto/create-etd-judgment.dto';
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
  @ApiOperation({ summary: 'Create a recommendation' })
  create(@Body() dto: CreateRecommendationDto, @Req() req: any) {
    return this.recommendationsService.create(dto, req.user?.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List recommendations by guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.recommendationsService.findByGuideline(guidelineId, pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recommendation by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationsService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update recommendation' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecommendationDto,
    @Req() req: any,
  ) {
    return this.recommendationsService.update(id, dto, req.user?.sub);
  }

  @Put(':id/status')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update recommendation status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecommendationStatusDto,
    @Req() req: any,
  ) {
    return this.recommendationsService.updateStatus(id, dto, req.user?.sub ?? 'system');
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Soft-delete recommendation' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationsService.softDelete(id);
  }

  // ── EtD endpoints ────────────────────────────────────────────────────────

  @Get(':id/etd')
  @ApiOperation({ summary: 'Get or initialize EtD factors + judgments for a recommendation' })
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
  @ApiOperation({ summary: 'Update EtD factor content and visibility' })
  updateFactor(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEtdFactorDto) {
    return this.etdService.updateFactor(id, dto);
  }

  @Post(':id/judgments')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Add an intervention judgment to an EtD factor' })
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
  @ApiOperation({ summary: 'Update an EtD judgment value and color' })
  updateJudgment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEtdJudgmentDto) {
    return this.etdService.updateJudgment(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Delete an EtD judgment (remove intervention from factor)' })
  deleteJudgment(@Param('id', ParseUUIDPipe) id: string) {
    return this.etdService.deleteJudgment(id);
  }
}
