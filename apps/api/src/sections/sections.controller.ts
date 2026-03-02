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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';

@ApiTags('Sections')
@ApiBearerAuth()
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new section' })
  create(@Body() dto: CreateSectionDto) {
    return this.sectionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sections by guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(@Query('guidelineId', ParseUUIDPipe) guidelineId: string) {
    return this.sectionsService.findByGuideline(guidelineId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get section by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update section' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(id, dto);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder sections' })
  reorder(@Body() dto: ReorderSectionsDto) {
    return this.sectionsService.reorder(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete section' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.softDelete(id);
  }
}
