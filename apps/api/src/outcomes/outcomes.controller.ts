import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OutcomesService } from './outcomes.service';
import { CreateOutcomeDto } from './dto/create-outcome.dto';
import { UpdateOutcomeDto } from './dto/update-outcome.dto';
import { PaginationQueryDto } from '../common/dto';

@ApiTags('Outcomes')
@ApiBearerAuth()
@Controller('outcomes')
export class OutcomesController {
  constructor(private readonly outcomesService: OutcomesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an outcome' })
  create(@Body() dto: CreateOutcomeDto) {
    return this.outcomesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List outcomes by PICO' })
  @ApiQuery({ name: 'picoId', required: true })
  findByPico(
    @Query('picoId', ParseUUIDPipe) picoId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.outcomesService.findByPico(picoId, pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get outcome by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.outcomesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update outcome' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOutcomeDto) {
    return this.outcomesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete outcome' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.outcomesService.softDelete(id);
  }
}
