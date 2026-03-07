import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentStatusDto } from './dto/create-comment.dto';
import { PaginationQueryDto } from '../common/dto';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a feedback comment' })
  create(@Body() dto: CreateCommentDto) {
    // TODO: extract userId from JWT when auth is wired
    const userId = '00000000-0000-0000-0000-000000000001';
    return this.commentsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List comments by recommendation (top-level with nested replies)' })
  @ApiQuery({ name: 'recommendationId', required: true })
  findByRecommendation(
    @Query('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.commentsService.findByRecommendation(recommendationId, pagination?.page, pagination?.limit);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update comment status (open/resolved/rejected)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentStatusDto,
  ) {
    return this.commentsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.commentsService.remove(id);
  }
}
