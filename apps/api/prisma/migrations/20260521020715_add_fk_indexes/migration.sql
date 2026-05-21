-- AlterTable
ALTER TABLE "PdfExportJob" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ChecklistItem_guidelineId_idx" ON "ChecklistItem"("guidelineId");

-- CreateIndex
CREATE INDEX "CoiDocument_coiRecordId_idx" ON "CoiDocument"("coiRecordId");

-- CreateIndex
CREATE INDEX "CoiInterventionConflict_coiRecordId_idx" ON "CoiInterventionConflict"("coiRecordId");

-- CreateIndex
CREATE INDEX "EmrElement_recommendationId_idx" ON "EmrElement"("recommendationId");

-- CreateIndex
CREATE INDEX "EtdJudgment_etdFactorId_idx" ON "EtdJudgment"("etdFactorId");

-- CreateIndex
CREATE INDEX "FeedbackComment_recommendationId_idx" ON "FeedbackComment"("recommendationId");

-- CreateIndex
CREATE INDEX "InternalDocument_guidelineId_idx" ON "InternalDocument"("guidelineId");

-- CreateIndex
CREATE INDEX "Milestone_guidelineId_idx" ON "Milestone"("guidelineId");

-- CreateIndex
CREATE INDEX "Outcome_picoId_idx" ON "Outcome"("picoId");

-- CreateIndex
CREATE INDEX "Outcome_picoId_isDeleted_idx" ON "Outcome"("picoId", "isDeleted");

-- CreateIndex
CREATE INDEX "OutcomeReference_referenceId_idx" ON "OutcomeReference"("referenceId");

-- CreateIndex
CREATE INDEX "Pico_guidelineId_idx" ON "Pico"("guidelineId");

-- CreateIndex
CREATE INDEX "PicoRecommendation_recommendationId_idx" ON "PicoRecommendation"("recommendationId");

-- CreateIndex
CREATE INDEX "Poll_guidelineId_idx" ON "Poll"("guidelineId");

-- CreateIndex
CREATE INDEX "PracticalIssue_picoId_idx" ON "PracticalIssue"("picoId");

-- CreateIndex
CREATE INDEX "Recommendation_guidelineId_idx" ON "Recommendation"("guidelineId");

-- CreateIndex
CREATE INDEX "ReferenceAttachment_referenceId_idx" ON "ReferenceAttachment"("referenceId");

-- CreateIndex
CREATE INDEX "Section_guidelineId_idx" ON "Section"("guidelineId");

-- CreateIndex
CREATE INDEX "SectionPico_picoId_idx" ON "SectionPico"("picoId");

-- CreateIndex
CREATE INDEX "SectionRecommendation_sectionId_idx" ON "SectionRecommendation"("sectionId");

-- CreateIndex
CREATE INDEX "SectionRecommendation_recommendationId_idx" ON "SectionRecommendation"("recommendationId");

-- CreateIndex
CREATE INDEX "SectionReference_referenceId_idx" ON "SectionReference"("referenceId");

-- CreateIndex
CREATE INDEX "Task_guidelineId_idx" ON "Task"("guidelineId");
