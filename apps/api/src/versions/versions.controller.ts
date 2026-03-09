import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { VersionsService } from './versions.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Versions')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Publish a new guideline version' })
  publish(@Body() dto: CreateVersionDto) {
    // TODO: extract userId from JWT when auth is wired
    const userId = '00000000-0000-0000-0000-000000000001';
    return this.versionsService.publish(dto, userId);
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare two version snapshots side by side' })
  @ApiQuery({ name: 'v1', required: true, description: 'First version ID' })
  @ApiQuery({ name: 'v2', required: true, description: 'Second version ID' })
  compare(
    @Query('v1', ParseUUIDPipe) v1: string,
    @Query('v2', ParseUUIDPipe) v2: string,
  ) {
    return this.versionsService.compare(v1, v2);
  }

  @Get()
  @ApiOperation({ summary: 'List versions by guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.versionsService.findByGuideline(guidelineId, pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get version by ID (includes snapshot bundle)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.versionsService.findOne(id);
  }

  @Get(':id/export/json')
  @ApiOperation({ summary: 'Download the immutable JSON snapshot for a published version' })
  async downloadJson(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, versionNumber, guidelineId } = await this.versionsService.getSnapshotBuffer(id);
    const filename = `guideline-${guidelineId}-v${versionNumber}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
