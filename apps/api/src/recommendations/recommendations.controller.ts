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
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recommendation' })
  create(@Body() dto: CreateRecommendationDto, @Req() req: any) {
    return this.recommendationsService.create(dto, req.user?.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List recommendations by guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(@Query('guidelineId', ParseUUIDPipe) guidelineId: string) {
    return this.recommendationsService.findByGuideline(guidelineId);
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
}
