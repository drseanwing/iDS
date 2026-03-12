-- CreateEnum
CREATE TYPE "PdfJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "PdfExportJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guidelineId" UUID NOT NULL,
    "status" "PdfJobStatus" NOT NULL DEFAULT 'PENDING',
    "s3Key" TEXT,
    "errorMessage" TEXT,
    "options" JSONB,
    "requestedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PdfExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PdfExportJob_guidelineId_createdAt_idx" ON "PdfExportJob"("guidelineId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "PdfExportJob" ADD CONSTRAINT "PdfExportJob_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
