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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CoiService } from './coi.service';
import { CreateCoiDto, UpdateCoiDto } from './dto/create-coi.dto';
import { BulkCoiDto } from './dto/bulk-coi.dto';
import { PaginationQueryDto } from '../common/dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('COI')
@ApiBearerAuth()
@Controller('coi')
export class CoiController {
  constructor(private readonly coiService: CoiService) {}

  @Post()
  @ApiOperation({ summary: 'Create a COI record for the current user' })
  create(@Body() dto: CreateCoiDto, @CurrentUserId() userId: string) {
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
    @CurrentUserId() userId: string,
  ) {
    return this.coiService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a COI record' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coiService.remove(id);
  }

  // -----------------------------------------------------------------------
  // Document upload endpoints
  // -----------------------------------------------------------------------

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload a COI disclosure document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.coiService.uploadDocument(id, file);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List uploaded documents for a COI record' })
  getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.coiService.getDocuments(id);
  }

  // -----------------------------------------------------------------------
  // Bulk conflict operations
  // -----------------------------------------------------------------------

  @Post('guidelines/:guidelineId/bulk')
  @ApiOperation({ summary: 'Bulk set conflict levels per-intervention or per-member' })
  bulkSetConflicts(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Body() dto: BulkCoiDto,
  ) {
    return this.coiService.bulkSetConflictLevel(guidelineId, dto).then((count) => ({ updated: count }));
  }

  // -----------------------------------------------------------------------
  // Manual refresh endpoint
  // -----------------------------------------------------------------------

  @Post('guidelines/:guidelineId/refresh')
  @ApiOperation({ summary: 'Manually trigger intervention matrix refresh from PICOs' })
  async refreshMatrix(@Param('guidelineId', ParseUUIDPipe) guidelineId: string) {
    await this.coiService.refreshInterventionMatrix(guidelineId);
    return { message: 'Intervention matrix refreshed' };
  }
}
