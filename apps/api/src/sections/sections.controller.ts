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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a new section' })
  create(@Body() dto: CreateSectionDto) {
    return this.sectionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sections by guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.sectionsService.findByGuideline(guidelineId, pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get section by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update section' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(id, dto);
  }

  @Post('reorder')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Reorder sections' })
  reorder(@Body() dto: ReorderSectionsDto) {
    return this.sectionsService.reorder(dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Soft-delete section' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.softDelete(id);
  }

  @Post(':id/restore')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Restore a soft-deleted section' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.restore(id);
  }
}
