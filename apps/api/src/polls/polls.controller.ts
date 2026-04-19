import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PollsService } from './polls.service';
import { CreatePollDto, CastVoteDto } from './dto/create-poll.dto';
import { PaginationQueryDto } from '../common/dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('Polls')
@ApiBearerAuth()
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new poll / Delphi vote' })
  create(@Body() dto: CreatePollDto, @CurrentUserId() userId: string) {
    return this.pollsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List polls for a guideline (paginated)' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.pollsService.findByGuideline(guidelineId, pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a poll with votes' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.findOne(id);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Cast or update a vote on a poll' })
  castVote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CastVoteDto,
    @CurrentUserId() userId: string,
  ) {
    return this.pollsService.castVote(id, dto, userId);
  }

  @Put(':id/close')
  @ApiOperation({ summary: 'Close a poll (no more votes)' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.close(id);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get aggregated poll results' })
  getResults(@Param('id', ParseUUIDPipe) id: string) {
    return this.pollsService.getResults(id);
  }
}
