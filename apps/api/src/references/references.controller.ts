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
  @ApiOperation({ summary: 'List references by guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(@Query('guidelineId', ParseUUIDPipe) guidelineId: string) {
    return this.referencesService.findByGuideline(guidelineId);
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
