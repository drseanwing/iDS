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
import { ReferencesService } from './references.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { PaginationQueryDto } from '../common/dto';

@ApiTags('References')
@ApiBearerAuth()
@Controller('references')
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reference' })
  create(@Body() dto: CreateReferenceDto) {
    return this.referencesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List references, optionally filtered by guideline' })
  @ApiQuery({ name: 'guidelineId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('guidelineId') guidelineId?: string,
    @Query('search') search?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    if (guidelineId) {
      return this.referencesService.findByGuideline(guidelineId, pagination?.page, pagination?.limit);
    }
    return this.referencesService.findAll(pagination?.page, pagination?.limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reference by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.referencesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update reference' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferenceDto,
  ) {
    return this.referencesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete reference' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.referencesService.softDelete(id);
  }
}
