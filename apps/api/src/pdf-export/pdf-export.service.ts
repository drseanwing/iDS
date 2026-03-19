import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GuidelinesService } from '../guidelines/guidelines.service';
import { PdfGeneratorService, PdfExportOptions } from './pdf-generator.service';

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly guidelinesService: GuidelinesService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  /**
   * Queue (start) an async PDF export job.
   * Returns the job record immediately; actual generation runs in background.
   *
   * Idempotency: if a PENDING or PROCESSING job already exists for the same
   * guideline with the same options within the last 5 minutes, the existing
   * job is returned instead of creating a duplicate.
   */
  async requestExport(
    guidelineId: string,
    requestedBy: string,
    options?: PdfExportOptions,
  ) {
    // Verify guideline exists
    await this.guidelinesService.findOne(guidelineId);

    // Idempotency check: look for an active job with matching options in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const optionsJson = options ? JSON.stringify(options) : null;

    const existingJob = await this.prisma.pdfExportJob.findFirst({
      where: {
        guidelineId,
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { gte: fiveMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingJob) {
      // Check options match (null/undefined treated as equivalent to empty object)
      const existingOptionsJson = existingJob.options
        ? JSON.stringify(existingJob.options)
        : null;
      const optionsMatch = optionsJson === existingOptionsJson ||
        (optionsJson === null && existingOptionsJson === null) ||
        (optionsJson === '{}' && existingOptionsJson === null) ||
        (optionsJson === null && existingOptionsJson === '{}');

      if (optionsMatch) {
        this.logger.log(
          `Idempotency: returning existing job ${existingJob.id} for guideline ${guidelineId}`,
        );
        return {
          jobId: existingJob.id,
          status: existingJob.status,
          createdAt: existingJob.createdAt,
          deduplicated: true,
        };
      }
    }

    const job = await this.prisma.pdfExportJob.create({
      data: {
        guidelineId,
        requestedBy,
        status: 'PENDING',
        options: options ? (options as any) : undefined,
      },
    });

    // Fire-and-forget background processing
    this.processJob(job.id).catch((err) => {
      this.logger.error(`Unhandled error in PDF job ${job.id}: ${err.message}`, err.stack);
    });

    return {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    };
  }

  /**
   * Get the status and metadata of a PDF export job.
   */
  async getJobStatus(jobId: string) {
    const job = await this.prisma.pdfExportJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        guidelineId: true,
        status: true,
        s3Key: true,
        errorMessage: true,
        options: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`PDF export job ${jobId} not found`);
    }

    return {
      ...job,
      downloadReady: job.status === 'COMPLETED' && !!job.s3Key,
    };
  }

  /**
   * List recent PDF export jobs for a guideline.
   */
  async listJobs(guidelineId: string, limit = 10) {
    return this.prisma.pdfExportJob.findMany({
      where: { guidelineId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        errorMessage: true,
      },
    });
  }

  /**
   * Download the generated PDF. Returns the Buffer.
   */
  async downloadPdf(jobId: string): Promise<{ buffer: Buffer; filename: string }> {
    const job = await this.prisma.pdfExportJob.findUnique({
      where: { id: jobId },
      include: { guideline: { select: { shortName: true, id: true } } },
    });

    if (!job) {
      throw new NotFoundException(`PDF export job ${jobId} not found`);
    }

    if (job.status !== 'COMPLETED' || !job.s3Key) {
      throw new NotFoundException('PDF not yet available. Current status: ' + job.status);
    }

    const buffer = await this.storage.download(job.s3Key);
    const slug = job.guideline.shortName || job.guideline.id;
    const filename = `guideline-${slug}.pdf`;

    return { buffer, filename };
  }

  /* ================================================================ */
  /*  Background job processing                                        */
  /* ================================================================ */

  private async processJob(jobId: string): Promise<void> {
    // Mark as processing
    const job = await this.prisma.pdfExportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      this.logger.log(`Starting PDF generation for job ${jobId}, guideline ${job.guidelineId}`);

      // Fetch the full guideline export data
      const exportData = await this.guidelinesService.exportJson(job.guidelineId);

      // Parse stored options
      const options: PdfExportOptions = (job.options as any) ?? {};

      // Generate PDF
      const pdfBuffer = await this.pdfGenerator.generatePdf(exportData, options);

      // Upload to S3
      const s3Key = `pdf-exports/${job.guidelineId}/${jobId}.pdf`;
      await this.storage.upload(s3Key, pdfBuffer, 'application/pdf');

      // Mark as completed
      await this.prisma.pdfExportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          s3Key,
          completedAt: new Date(),
        },
      });

      this.logger.log(`PDF generation completed for job ${jobId} (${pdfBuffer.length} bytes)`);
    } catch (err: any) {
      this.logger.error(`PDF generation failed for job ${jobId}: ${err.message}`, err.stack);

      await this.prisma.pdfExportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: err.message?.substring(0, 500) ?? 'Unknown error',
          completedAt: new Date(),
        },
      });
    }
  }
}
