import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { OutcomesService } from './outcomes.service';
import { CreateOutcomeDto } from './dto/create-outcome.dto';
import { UpdateOutcomeDto } from './dto/update-outcome.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('Outcomes')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('outcomes')
export class OutcomesController {
  constructor(private readonly outcomesService: OutcomesService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
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
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update outcome' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOutcomeDto) {
    return this.outcomesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Soft-delete outcome' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.outcomesService.softDelete(id);
  }

  // ---------------------------------------------------------------------------
  // Shadow-outcome workflow
  // ---------------------------------------------------------------------------

  @Post(':id/shadow')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Create a shadow (draft copy) of an outcome' })
  @ApiParam({ name: 'id', description: 'ID of the outcome to shadow' })
  createShadow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.outcomesService.createShadow(id, userId);
  }

  @Post(':id/promote')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Promote a shadow outcome to replace the original' })
  @ApiParam({ name: 'id', description: 'ID of the shadow outcome to promote' })
  promoteShadow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.outcomesService.promoteShadow(id, userId);
  }

  @Get(':id/shadows')
  @ApiOperation({ summary: 'List all shadow outcomes for a given outcome' })
  @ApiParam({ name: 'id', description: 'ID of the original outcome' })
  findShadows(@Param('id', ParseUUIDPipe) id: string) {
    return this.outcomesService.findShadows(id);
  }
}
