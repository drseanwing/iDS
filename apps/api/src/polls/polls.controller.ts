import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PollsService } from './polls.service';
import { CreatePollDto, CastVoteDto } from './dto/create-poll.dto';
import { PaginationQueryDto } from '../common/dto';
import { CurrentUserId } from '../auth/current-user.decorator';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';
import { EntityType } from '../auth/entity-type.decorator';

@ApiTags('Polls')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Create a new poll / Delphi vote' })
  create(@Body() dto: CreatePollDto, @CurrentUserId() userId: string) {
    return this.pollsService.create(dto, userId);
  }

  @Get()
  @Roles('ADMIN', 'AUTHOR', 'REVIEWER')
  @ApiOperation({ summary: 'List polls for a guideline (paginated)' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.pollsService.findByGuideline(guidelineId, pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @Roles('ADMIN', 'AUTHOR', 'REVIEWER')
  @EntityType('poll')
  @ApiOperation({ summary: 'Get a poll with votes' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.findOne(id);
  }

  @Post(':id/vote')
  @Roles('ADMIN', 'AUTHOR', 'REVIEWER')
  @EntityType('poll')
  @ApiOperation({ summary: 'Cast or update a vote on a poll' })
  castVote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CastVoteDto,
    @CurrentUserId() userId: string,
  ) {
    return this.pollsService.castVote(id, dto, userId);
  }

  @Put(':id/close')
  @Roles('ADMIN', 'AUTHOR')
  @EntityType('poll')
  @ApiOperation({ summary: 'Close a poll (no more votes)' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.close(id);
  }

  @Get(':id/results')
  @Roles('ADMIN', 'AUTHOR', 'REVIEWER')
  @EntityType('poll')
  @ApiOperation({ summary: 'Get aggregated poll results' })
  getResults(@Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.getResults(id);
  }
}
