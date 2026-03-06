import { Controller, Get, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { PaginationQueryDto } from '../common/dto';

@ApiTags('Activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'List activity log entries by guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'actionType', required: false })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('actionType') actionType?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.activityService.findByGuideline(
      guidelineId,
      { userId, entityType, actionType },
      pagination?.page,
      pagination?.limit,
    );
  }
}
