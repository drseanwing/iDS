import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CoiService } from './coi.service';
import { CreateCoiDto, UpdateCoiDto } from './dto/create-coi.dto';
import { PaginationQueryDto } from '../common/dto';

@ApiTags('COI')
@ApiBearerAuth()
@Controller('coi')
export class CoiController {
  constructor(private readonly coiService: CoiService) {}

  @Post()
  @ApiOperation({ summary: 'Create a COI record for the current user' })
  create(@Body() dto: CreateCoiDto) {
    // TODO: extract userId from JWT when auth is wired
    const userId = '00000000-0000-0000-0000-000000000001';
    return this.coiService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List COI records for a guideline (paginated)' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.coiService.findByGuideline(guidelineId, pagination?.page, pagination?.limit);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get COI record for a specific user in a guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
  ) {
    return this.coiService.findByUser(guidelineId, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a COI record' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCoiDto,
  ) {
    // TODO: extract userId from JWT when auth is wired
    const userId = '00000000-0000-0000-0000-000000000001';
    return this.coiService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a COI record' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coiService.remove(id);
  }
}
