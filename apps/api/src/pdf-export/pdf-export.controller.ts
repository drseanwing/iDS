import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  Res,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PdfExportService } from './pdf-export.service';
import { RequestPdfExportDto } from './dto/request-pdf-export.dto';
import { RbacGuard } from '../auth/rbac.guard';

@ApiTags('PDF Export')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller()
export class PdfExportController {
  constructor(private readonly pdfExportService: PdfExportService) {}

  @Post('guidelines/:id/export/pdf')
  @ApiOperation({
    summary: 'Request async PDF generation for a guideline',
    description:
      'Starts a background PDF generation job. Returns a job ID that can be polled for status. ' +
      'Template customization options (column layout, PICO display mode, etc.) can be provided in the request body.',
  })
  @ApiParam({ name: 'id', description: 'Guideline ID' })
  requestExport(
    @Param('id', ParseUUIDPipe) guidelineId: string,
    @Body() dto: RequestPdfExportDto,
    @Req() req: any,
  ) {
    const userId: string = req.user?.sub;
    return this.pdfExportService.requestExport(guidelineId, userId, dto);
  }

  @Get('pdf-jobs/:jobId')
  @ApiOperation({ summary: 'Get PDF export job status' })
  @ApiParam({ name: 'jobId', description: 'PDF export job ID' })
  getJobStatus(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.pdfExportService.getJobStatus(jobId);
  }

  @Get('pdf-jobs/:jobId/download')
  @ApiOperation({ summary: 'Download the generated PDF' })
  @ApiParam({ name: 'jobId', description: 'PDF export job ID' })
  async downloadPdf(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.pdfExportService.downloadPdf(jobId);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get('guidelines/:id/pdf-jobs')
  @ApiOperation({ summary: 'List recent PDF export jobs for a guideline' })
  @ApiParam({ name: 'id', description: 'Guideline ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max jobs to return (default: 10)' })
  listJobs(
    @Param('id', ParseUUIDPipe) guidelineId: string,
    @Query('limit') limit?: string,
  ) {
    return this.pdfExportService.listJobs(guidelineId, limit ? parseInt(limit, 10) : undefined);
  }
}
