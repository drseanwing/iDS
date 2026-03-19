# ADR-005: Async PDF Generation Pipeline

## Status

Accepted

## Context

OpenGRADE needs to export guidelines as PDF and DOCX documents. PDF generation is computationally expensive and can take 10-30 seconds depending on guideline size.

If we made users wait synchronously for PDF generation, it would result in:
- Slow API responses that could timeout
- Blocked HTTP connections
- Poor user experience
- Resource waste from blocking processes

We needed an asynchronous model where PDF generation happens in the background.

## Decision

We implemented an **async job queue pattern** for PDF generation:

### Job Lifecycle

1. **Request (0ms)** - User requests PDF export
2. **Job Created (1ms)** - System creates a PdfExportJob record with `PENDING` status
3. **Return Immediately (5ms)** - Return jobId to client
4. **Background Generation (10-30s)** - Separate process generates PDF
5. **Upload to S3 (2-5s)** - Save PDF to S3
6. **Status Update (1ms)** - Mark job as `COMPLETED`
7. **Client Polls (0-60s)** - Client polls for completion
8. **Download (1-10s)** - User downloads from S3 URL

### Database Schema

```sql
CREATE TABLE pdf_export_job (
  id UUID PRIMARY KEY,
  guideline_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  status VARCHAR NOT NULL,  -- PENDING, PROCESSING, COMPLETED, FAILED
  error_message TEXT,
  s3_key VARCHAR,  -- path in S3 storage
  s3_expires_at TIMESTAMPTZ,
  options JSONB,  -- export configuration { format, includeAppendices, ... }
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (guideline_id) REFERENCES guideline(id)
);
```

### Request-Response Flow

```typescript
// Request PDF export
POST /guidelines/:id/export
{
  "format": "pdf",
  "includeAppendices": true
}

// Response (immediate, < 10ms)
{
  "jobId": "job-abc123",
  "status": "PENDING",
  "createdAt": "2024-03-16T14:22:00Z"
}

// Poll for status
GET /pdf-export/job-abc123
{
  "jobId": "job-abc123",
  "status": "COMPLETED",
  "downloadUrl": "https://s3.example.com/exports/abc123.pdf",
  "expiresAt": "2024-03-17T14:22:00Z"
}
```

### Background Processing

The background processor:

1. **Fetches the job** - Reads PdfExportJob from database
2. **Sets status to PROCESSING** - Signals that work is underway
3. **Generates PDF** - Uses `pdf-lib` or Puppeteer to create document
4. **Uploads to S3** - Stores PDF with a unique key
5. **Updates job** - Sets status to COMPLETED and stores S3 URL
6. **Handles errors** - On failure, stores error message and sets status to FAILED

```typescript
// In pdf-export.service.ts
async processJob(jobId: string) {
  try {
    const job = await this.prisma.pdfExportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    const guideline = await this.guidelinesService.findOne(job.guidelineId);
    const pdf = await this.pdfGenerator.generate(guideline, job.options);

    const s3Key = `exports/${jobId}.pdf`;
    const s3Url = await this.storage.uploadStream(s3Key, pdf);

    await this.prisma.pdfExportJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        s3Key,
        s3ExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await this.prisma.pdfExportJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
      },
    });
  }
}
```

### Idempotency

The system prevents duplicate jobs:

- If a user requests PDF export twice within 5 minutes with the same options, the system returns the existing job instead of creating a new one
- This prevents accidental duplicate processing

```typescript
const existingJob = await this.prisma.pdfExportJob.findFirst({
  where: {
    guidelineId,
    status: { in: ['PENDING', 'PROCESSING'] },
    createdAt: { gte: fiveMinutesAgo },
  },
});

if (existingJob) return existingJob;
```

## Consequences

### Positive

1. **Fast Responses** - API responds immediately, not blocked by PDF generation
2. **Resource Efficiency** - PDF generation doesn't block HTTP threads
3. **Scalability** - Background jobs can be distributed across multiple workers
4. **Resilience** - Failed jobs are visible and can be retried manually
5. **Audit Trail** - Every export is recorded with who requested it and when
6. **User Experience** - Client polls for status, giving user feedback
7. **S3 Integration** - PDFs are stored durably and can be downloaded later

### Negative

1. **Polling Overhead** - Clients must poll for completion (though WebSocket would be better)
2. **Storage Cost** - S3 storage costs money and requires cleanup of old files
3. **Expiration Complexity** - Managing S3 URL expiration adds complexity
4. **Error Visibility** - Users must check job status to see errors; no immediate feedback
5. **Race Conditions** - If guideline is modified while PDF is generating, result may be stale
6. **Retry Complexity** - Failed jobs require manual intervention or automatic retry logic

## Implementation Details

### Storage Service

```typescript
// In storage.service.ts
async uploadStream(key: string, stream: ReadableStream): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: stream,
    ServerSideEncryption: 'AES256',
  });

  await this.s3Client.send(command);

  return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
}

async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(this.s3Client, command, { expiresIn });
}
```

### PDF Generator

```typescript
// In pdf-generator.service.ts
async generate(guideline: Guideline, options: PdfExportOptions): Promise<Buffer> {
  const html = this.renderGuidelineHtml(guideline, options);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);

  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
  });

  await browser.close();

  return pdf;
}
```

## Related ADRs

- [ADR-002: NestJS Module Boundaries](./002-nestjs-module-boundaries.md) - PdfExportModule as a separate concern
- [ADR-006: FHIR Facade Endpoints](./006-fhir-facade-endpoints.md) - Async export available via FHIR endpoints too

## Further Reading

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Puppeteer PDF Generation](https://pptr.dev/guides/generate-pdf)
- [Job Queue Patterns](https://en.wikipedia.org/wiki/Job_queue)
