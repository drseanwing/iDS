import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

// ── Guideline-scoped Tag CRUD ─────────────────────────────────────────────

@ApiTags('Tags')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('guidelines/:guidelineId/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Create a tag for a guideline' })
  @ApiParam({ name: 'guidelineId', description: 'Guideline UUID' })
  @ApiResponse({ status: 201, description: 'Tag created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN or AUTHOR role' })
  create(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.tagsService.create(guidelineId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tags for a guideline' })
  @ApiParam({ name: 'guidelineId', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'Tags returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByGuideline(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
  ) {
    return this.tagsService.findByGuideline(guidelineId);
  }

  @Put(':tagId')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update a tag name and/or color' })
  @ApiParam({ name: 'guidelineId', description: 'Guideline UUID' })
  @ApiParam({ name: 'tagId', description: 'Tag UUID' })
  @ApiResponse({ status: 200, description: 'Tag updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN or AUTHOR role' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  update(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.update(guidelineId, tagId, dto);
  }

  @Delete(':tagId')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Delete a tag (cascades to recommendation assignments)' })
  @ApiParam({ name: 'guidelineId', description: 'Guideline UUID' })
  @ApiParam({ name: 'tagId', description: 'Tag UUID' })
  @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN or AUTHOR role' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  remove(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.tagsService.remove(guidelineId, tagId);
  }
}

// ── Recommendation tag-assignment endpoints ───────────────────────────────

@ApiTags('Tags')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('recommendations/:recommendationId/tags')
export class RecommendationTagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post(':tagId')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Add a tag to a recommendation' })
  @ApiParam({ name: 'recommendationId', description: 'Recommendation UUID' })
  @ApiParam({ name: 'tagId', description: 'Tag UUID' })
  @ApiResponse({ status: 201, description: 'Tag assigned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN or AUTHOR role' })
  @ApiResponse({ status: 409, description: 'Tag already assigned to this recommendation' })
  addTag(
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.tagsService.addTagToRecommendation(recommendationId, tagId);
  }

  @Delete(':tagId')
  @Roles('ADMIN', 'AUTHOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a tag from a recommendation' })
  @ApiParam({ name: 'recommendationId', description: 'Recommendation UUID' })
  @ApiParam({ name: 'tagId', description: 'Tag UUID' })
  @ApiResponse({ status: 200, description: 'Tag removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN or AUTHOR role' })
  @ApiResponse({ status: 404, description: 'Tag assignment not found' })
  removeTag(
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.tagsService.removeTagFromRecommendation(recommendationId, tagId);
  }
}
