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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { EtdService } from './etd.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { UpdateEtdFactorDto } from './dto/update-etd-factor.dto';
import { UpdateEtdJudgmentDto } from './dto/update-etd-judgment.dto';
import { CreateEtdJudgmentDto } from './dto/create-etd-judgment.dto';
import { PaginationQueryDto } from '../common/dto';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly etdService: EtdService,
  ) {}

  @Post()
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
  @ApiOperation({ summary: 'Update recommendation' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecommendationDto,
    @Req() req: any,
  ) {
    return this.recommendationsService.update(id, dto, req.user?.sub);
  }

  @Delete(':id')
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
@Controller('etd-factors')
export class EtdFactorsController {
  constructor(private readonly etdService: EtdService) {}

  @Put(':id')
  @ApiOperation({ summary: 'Update EtD factor content and visibility' })
  updateFactor(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEtdFactorDto) {
    return this.etdService.updateFactor(id, dto);
  }

  @Post(':id/judgments')
  @ApiOperation({ summary: 'Add an intervention judgment to an EtD factor' })
  addJudgment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateEtdJudgmentDto) {
    return this.etdService.addJudgment(id, dto);
  }
}

@ApiTags('EtD Judgments')
@ApiBearerAuth()
@Controller('etd-judgments')
export class EtdJudgmentsController {
  constructor(private readonly etdService: EtdService) {}

  @Put(':id')
  @ApiOperation({ summary: 'Update an EtD judgment value and color' })
  updateJudgment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEtdJudgmentDto) {
    return this.etdService.updateJudgment(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an EtD judgment (remove intervention from factor)' })
  deleteJudgment(@Param('id', ParseUUIDPipe) id: string) {
    return this.etdService.deleteJudgment(id);
  }
}
