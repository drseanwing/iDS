import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Sections')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Create a new section',
    description: 'Creates a new section within a guideline. Sections organize the narrative content and can be nested hierarchically.',
  })
  @ApiResponse({ status: 201, description: 'Section created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Parent guideline not found' })
  create(@Body() dto: CreateSectionDto) {
    return this.sectionsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List sections by guideline',
    description: 'Returns all sections belonging to the specified guideline, ordered by their display position. Non-deleted sections are returned by default.',
  })
  @ApiQuery({ name: 'guidelineId', required: true, description: 'Guideline UUID to filter sections by' })
  @ApiQuery({ name: 'onlyDeleted', required: false, type: Boolean, description: 'Show only soft-deleted sections' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results per page' })
  @ApiResponse({ status: 200, description: 'Sections returned successfully' })
  @ApiResponse({ status: 400, description: 'guidelineId is not a valid UUID' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query('onlyDeleted') onlyDeleted?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.sectionsService.findByGuideline(
      guidelineId,
      pagination?.page,
      pagination?.limit,
      onlyDeleted === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get section by ID',
    description: 'Returns the full content and metadata for a single section identified by its UUID.',
  })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({ status: 200, description: 'Section returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Update section',
    description: 'Updates the title, rich-text body, and other metadata of an existing section.',
  })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(id, dto);
  }

  @Post('reorder')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Reorder sections',
    description: 'Updates the display order of multiple sections within a guideline in a single atomic operation.',
  })
  @ApiResponse({ status: 200, description: 'Sections reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid reorder payload – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  reorder(@Body() dto: ReorderSectionsDto) {
    return this.sectionsService.reorder(dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Soft-delete section',
    description: 'Marks the section as deleted without permanently removing it. The section can be restored by an authorized user.',
  })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({ status: 200, description: 'Section soft-deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.softDelete(id);
  }

  @Post(':id/restore')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Restore a soft-deleted section',
    description: 'Removes the soft-delete flag from a section, making it visible again in normal queries.',
  })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({ status: 200, description: 'Section restored successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.restore(id);
  }
}
