import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentStatusDto } from './dto/create-comment.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR', 'REVIEWER')
  @ApiOperation({ summary: 'Create a feedback comment' })
  create(@Body() dto: CreateCommentDto, @CurrentUserId() userId: string) {
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
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update comment status (open/resolved/rejected)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentStatusDto,
  ) {
    return this.commentsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.commentsService.remove(id);
  }
}
