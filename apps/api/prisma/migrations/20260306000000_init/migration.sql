-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "GuidelineType" AS ENUM ('PERSONAL', 'ORGANIZATIONAL', 'EVIDENCE_SUMMARY');

-- CreateEnum
CREATE TYPE "GuidelineStatus" AS ENUM ('DRAFT', 'DRAFT_INTERNAL', 'PUBLISHED_INTERNAL', 'PUBLIC_CONSULTATION', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "GuidelineRole" AS ENUM ('ADMIN', 'AUTHOR', 'REVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "StudyType" AS ENUM ('PRIMARY_STUDY', 'SYSTEMATIC_REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "OutcomeType" AS ENUM ('DICHOTOMOUS', 'CONTINUOUS', 'NARRATIVE', 'QUALITATIVE_CERQUAL');

-- CreateEnum
CREATE TYPE "OutcomeState" AS ENUM ('UNDER_DEVELOPMENT', 'FOR_REVIEW', 'UPDATED', 'FINISHED');

-- CreateEnum
CREATE TYPE "EffectMeasure" AS ENUM ('RR', 'OR', 'HR', 'MD', 'SMD', 'PROTECTIVE_EFFICACY');

-- CreateEnum
CREATE TYPE "CertaintyLevel" AS ENUM ('HIGH', 'MODERATE', 'LOW', 'VERY_LOW');

-- CreateEnum
CREATE TYPE "GradeRating" AS ENUM ('NOT_SERIOUS', 'SERIOUS', 'VERY_SERIOUS');

-- CreateEnum
CREATE TYPE "UpgradeRating" AS ENUM ('NONE', 'PRESENT', 'LARGE', 'VERY_LARGE');

-- CreateEnum
CREATE TYPE "CodeSystem" AS ENUM ('SNOMED_CT', 'ICD10', 'ATC', 'RXNORM');

-- CreateEnum
CREATE TYPE "PicoElement" AS ENUM ('POPULATION', 'INTERVENTION', 'COMPARATOR', 'OUTCOME');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('REVMAN', 'GRADEPRO', 'MAGICAPP_ZIP', 'MANUAL');

-- CreateEnum
CREATE TYPE "RecommendationStrength" AS ENUM ('STRONG_FOR', 'CONDITIONAL_FOR', 'CONDITIONAL_AGAINST', 'STRONG_AGAINST', 'NOT_SET');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('GRADE', 'PRACTICE_STATEMENT', 'STATUTORY', 'INFO_BOX', 'CONSENSUS', 'NO_LABEL');

-- CreateEnum
CREATE TYPE "RecStatus" AS ENUM ('NEW', 'UPDATED', 'IN_REVIEW', 'POSSIBLY_OUTDATED', 'UPDATED_EVIDENCE', 'REVIEWED', 'NO_LABEL');

-- CreateEnum
CREATE TYPE "EtdMode" AS ENUM ('FOUR_FACTOR', 'SEVEN_FACTOR', 'TWELVE_FACTOR');

-- CreateEnum
CREATE TYPE "VersionType" AS ENUM ('MAJOR', 'MINOR');

-- CreateEnum
CREATE TYPE "ConflictLevel" AS ENUM ('NONE', 'LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "PollType" AS ENUM ('OPEN_TEXT', 'MULTIPLE_CHOICE', 'STRENGTH_VOTE', 'ETD_JUDGMENT');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "EmrElementType" AS ENUM ('TARGET_POPULATION', 'INTERVENTION');

-- CreateEnum
CREATE TYPE "PicoDisplay" AS ENUM ('INLINE', 'ANNEX');

-- CreateEnum
CREATE TYPE "EtdFactorType" AS ENUM ('BENEFITS_HARMS', 'QUALITY_OF_EVIDENCE', 'PREFERENCES_VALUES', 'RESOURCES_OTHER', 'EQUITY', 'ACCEPTABILITY', 'FEASIBILITY', 'DESIRABLE_EFFECTS', 'UNDESIRABLE_EFFECTS', 'BALANCE', 'RESOURCES_REQUIRED', 'CERTAINTY_OF_RESOURCES', 'COST_EFFECTIVENESS');

-- CreateEnum
CREATE TYPE "PracticalIssueCategory" AS ENUM ('MEDICATION_ROUTINE', 'TESTS_AND_VISITS', 'PROCEDURE_AND_DEVICE', 'RECOVERY_AND_ADAPTATION', 'COORDINATION_OF_CARE', 'ADVERSE_EFFECTS', 'INTERACTIONS_AND_ANTIDOTE', 'PHYSICAL_WELLBEING', 'EMOTIONAL_WELLBEING', 'PREGNANCY_AND_NURSING', 'COSTS_AND_ACCESS', 'FOOD_AND_DRINKS', 'EXERCISE_AND_ACTIVITIES', 'SOCIAL_LIFE_AND_RELATIONSHIPS', 'WORK_AND_EDUCATION', 'TRAVEL_AND_DRIVING');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "customColors" JSONB,
    "strengthLabels" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "keycloakId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guideline" (
    "id" UUID NOT NULL,
    "fhirMeta" JSONB NOT NULL DEFAULT '{}',
    "organizationId" UUID,
    "title" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "disclaimer" TEXT,
    "funding" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "startDate" TIMESTAMP(3),
    "guidelineType" "GuidelineType" NOT NULL DEFAULT 'ORGANIZATIONAL',
    "status" "GuidelineStatus" NOT NULL DEFAULT 'DRAFT',
    "etdMode" "EtdMode" NOT NULL DEFAULT 'SEVEN_FACTOR',
    "showSectionNumbers" BOOLEAN NOT NULL DEFAULT true,
    "showCertaintyInLabel" BOOLEAN NOT NULL DEFAULT false,
    "showGradeDescription" BOOLEAN NOT NULL DEFAULT true,
    "trackChangesDefault" BOOLEAN NOT NULL DEFAULT false,
    "enableSubscriptions" BOOLEAN NOT NULL DEFAULT false,
    "enablePublicComments" BOOLEAN NOT NULL DEFAULT false,
    "showSectionTextPreview" BOOLEAN NOT NULL DEFAULT true,
    "pdfColumnLayout" INTEGER NOT NULL DEFAULT 1,
    "picoDisplayMode" "PicoDisplay" NOT NULL DEFAULT 'INLINE',
    "coverPageUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "Guideline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "parentId" UUID,
    "title" TEXT NOT NULL,
    "text" JSONB,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "nestingLevel" INTEGER NOT NULL DEFAULT 0,
    "excludeFromNumbering" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reference" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "fhirMeta" JSONB NOT NULL DEFAULT '{}',
    "title" TEXT NOT NULL,
    "authors" TEXT,
    "year" INTEGER,
    "abstract" TEXT,
    "pubmedId" TEXT,
    "doi" TEXT,
    "url" TEXT,
    "studyType" "StudyType" NOT NULL DEFAULT 'OTHER',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceAttachment" (
    "id" UUID NOT NULL,
    "referenceId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pico" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "fhirMeta" JSONB NOT NULL DEFAULT '{}',
    "population" TEXT NOT NULL,
    "intervention" TEXT NOT NULL,
    "comparator" TEXT NOT NULL,
    "narrativeSummary" JSONB,
    "motherPicoId" UUID,
    "importSource" "ImportSource",
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" UUID NOT NULL,
    "picoId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "outcomeType" "OutcomeType" NOT NULL,
    "state" "OutcomeState" NOT NULL DEFAULT 'UNDER_DEVELOPMENT',
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "importance" INTEGER,
    "effectMeasure" "EffectMeasure",
    "relativeEffect" DOUBLE PRECISION,
    "relativeEffectLower" DOUBLE PRECISION,
    "relativeEffectUpper" DOUBLE PRECISION,
    "baselineRisk" DOUBLE PRECISION,
    "absoluteEffectIntervention" DOUBLE PRECISION,
    "absoluteEffectComparison" DOUBLE PRECISION,
    "interventionParticipants" INTEGER,
    "comparisonParticipants" INTEGER,
    "numberOfStudies" INTEGER,
    "continuousUnit" TEXT,
    "continuousScaleLower" DOUBLE PRECISION,
    "continuousScaleUpper" DOUBLE PRECISION,
    "certaintyOverall" "CertaintyLevel",
    "riskOfBias" "GradeRating" NOT NULL DEFAULT 'NOT_SERIOUS',
    "inconsistency" "GradeRating" NOT NULL DEFAULT 'NOT_SERIOUS',
    "indirectness" "GradeRating" NOT NULL DEFAULT 'NOT_SERIOUS',
    "imprecision" "GradeRating" NOT NULL DEFAULT 'NOT_SERIOUS',
    "publicationBias" "GradeRating" NOT NULL DEFAULT 'NOT_SERIOUS',
    "largeEffect" "UpgradeRating" NOT NULL DEFAULT 'NONE',
    "doseResponse" "UpgradeRating" NOT NULL DEFAULT 'NONE',
    "plausibleConfounding" "UpgradeRating" NOT NULL DEFAULT 'NONE',
    "gradeFootnotes" JSONB,
    "plainLanguageSummary" TEXT,
    "forestPlotS3Key" TEXT,
    "isShadow" BOOLEAN NOT NULL DEFAULT false,
    "shadowOfId" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PicoCode" (
    "id" UUID NOT NULL,
    "picoId" UUID NOT NULL,
    "codeSystem" "CodeSystem" NOT NULL,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "element" "PicoElement" NOT NULL,

    CONSTRAINT "PicoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalIssue" (
    "id" UUID NOT NULL,
    "picoId" UUID NOT NULL,
    "category" "PracticalIssueCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" JSONB,
    "ordering" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PracticalIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "fhirMeta" JSONB NOT NULL DEFAULT '{}',
    "title" TEXT,
    "description" JSONB NOT NULL,
    "strength" "RecommendationStrength" NOT NULL DEFAULT 'NOT_SET',
    "recommendationType" "RecommendationType" NOT NULL DEFAULT 'GRADE',
    "header" TEXT,
    "remark" JSONB,
    "rationale" JSONB,
    "practicalInfo" JSONB,
    "recStatus" "RecStatus" NOT NULL DEFAULT 'NEW',
    "recStatusDate" TIMESTAMP(3),
    "recStatusComment" TEXT,
    "certaintyOfEvidence" "CertaintyLevel",
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtdFactor" (
    "id" UUID NOT NULL,
    "recommendationId" UUID NOT NULL,
    "factorType" "EtdFactorType" NOT NULL,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "summaryText" JSONB,
    "researchEvidence" JSONB,
    "additionalConsiderations" JSONB,
    "summaryPublic" BOOLEAN NOT NULL DEFAULT true,
    "evidencePublic" BOOLEAN NOT NULL DEFAULT true,
    "considerationsPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EtdFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtdJudgment" (
    "id" UUID NOT NULL,
    "etdFactorId" UUID NOT NULL,
    "interventionLabel" TEXT NOT NULL,
    "judgment" TEXT,
    "colorCode" TEXT,

    CONSTRAINT "EtdJudgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmrElement" (
    "id" UUID NOT NULL,
    "recommendationId" UUID NOT NULL,
    "elementType" "EmrElementType" NOT NULL,
    "codeSystem" "CodeSystem" NOT NULL,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "implementationDescription" TEXT,

    CONSTRAINT "EmrElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidelineVersion" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "versionType" "VersionType" NOT NULL,
    "comment" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" UUID NOT NULL,
    "snapshotBundle" JSONB NOT NULL,
    "pdfS3Key" TEXT,
    "jsonS3Key" TEXT,

    CONSTRAINT "GuidelineVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionPermission" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VersionPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalDocument" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidelinePermission" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "GuidelineRole" NOT NULL,

    CONSTRAINT "GuidelinePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLogEntry" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "entityTitle" TEXT,
    "changeDetails" JSONB,
    "comment" TEXT,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ActivityLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoiRecord" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "publicSummary" TEXT,
    "internalSummary" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoiRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoiInterventionConflict" (
    "id" UUID NOT NULL,
    "coiRecordId" UUID NOT NULL,
    "interventionLabel" TEXT NOT NULL,
    "conflictLevel" "ConflictLevel" NOT NULL DEFAULT 'NONE',
    "internalComment" TEXT,
    "excludeFromVoting" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CoiInterventionConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoiDocument" (
    "id" UUID NOT NULL,
    "coiRecordId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoiDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "responsiblePerson" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "ordering" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedBy" UUID,
    "checkedAt" TIMESTAMP(3),
    "ordering" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "recommendationId" UUID,
    "title" TEXT NOT NULL,
    "pollType" "PollType" NOT NULL,
    "options" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" UUID NOT NULL,
    "pollId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "value" JSONB NOT NULL,
    "comment" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackComment" (
    "id" UUID NOT NULL,
    "recommendationId" UUID NOT NULL,
    "parentId" UUID,
    "userId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "guidelineId" UUID NOT NULL,
    "assigneeId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "entityType" TEXT,
    "entityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionReference" (
    "sectionId" UUID NOT NULL,
    "referenceId" UUID NOT NULL,
    "ordering" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SectionReference_pkey" PRIMARY KEY ("sectionId","referenceId")
);

-- CreateTable
CREATE TABLE "SectionPico" (
    "sectionId" UUID NOT NULL,
    "picoId" UUID NOT NULL,
    "ordering" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SectionPico_pkey" PRIMARY KEY ("sectionId","picoId")
);

-- CreateTable
CREATE TABLE "SectionRecommendation" (
    "sectionId" UUID NOT NULL,
    "recommendationId" UUID NOT NULL,
    "ordering" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SectionRecommendation_pkey" PRIMARY KEY ("sectionId","recommendationId")
);

-- CreateTable
CREATE TABLE "PicoRecommendation" (
    "picoId" UUID NOT NULL,
    "recommendationId" UUID NOT NULL,

    CONSTRAINT "PicoRecommendation_pkey" PRIMARY KEY ("picoId","recommendationId")
);

-- CreateTable
CREATE TABLE "OutcomeReference" (
    "outcomeId" UUID NOT NULL,
    "referenceId" UUID NOT NULL,

    CONSTRAINT "OutcomeReference_pkey" PRIMARY KEY ("outcomeId","referenceId")
);

-- CreateTable
CREATE TABLE "RecommendationTag" (
    "recommendationId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "RecommendationTag_pkey" PRIMARY KEY ("recommendationId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_keycloakId_key" ON "User"("keycloakId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Guideline_shortName_key" ON "Guideline"("shortName");

-- CreateIndex
CREATE INDEX "Reference_guidelineId_pubmedId_idx" ON "Reference"("guidelineId", "pubmedId");

-- CreateIndex
CREATE INDEX "Reference_guidelineId_doi_idx" ON "Reference"("guidelineId", "doi");

-- CreateIndex
CREATE INDEX "PicoCode_picoId_codeSystem_idx" ON "PicoCode"("picoId", "codeSystem");

-- CreateIndex
CREATE UNIQUE INDEX "EtdFactor_recommendationId_factorType_key" ON "EtdFactor"("recommendationId", "factorType");

-- CreateIndex
CREATE UNIQUE INDEX "GuidelineVersion_guidelineId_versionNumber_key" ON "GuidelineVersion"("guidelineId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VersionPermission_versionId_userId_key" ON "VersionPermission"("versionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_guidelineId_email_key" ON "Subscriber"("guidelineId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_guidelineId_name_key" ON "Tag"("guidelineId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GuidelinePermission_guidelineId_userId_key" ON "GuidelinePermission"("guidelineId", "userId");

-- CreateIndex
CREATE INDEX "ActivityLogEntry_guidelineId_timestamp_idx" ON "ActivityLogEntry"("guidelineId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "ActivityLogEntry_guidelineId_entityType_entityId_idx" ON "ActivityLogEntry"("guidelineId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLogEntry_guidelineId_userId_idx" ON "ActivityLogEntry"("guidelineId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoiRecord_guidelineId_userId_key" ON "CoiRecord"("guidelineId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_userId_key" ON "PollVote"("pollId", "userId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guideline" ADD CONSTRAINT "Guideline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceAttachment" ADD CONSTRAINT "ReferenceAttachment_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pico" ADD CONSTRAINT "Pico_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_picoId_fkey" FOREIGN KEY ("picoId") REFERENCES "Pico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_shadowOfId_fkey" FOREIGN KEY ("shadowOfId") REFERENCES "Outcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PicoCode" ADD CONSTRAINT "PicoCode_picoId_fkey" FOREIGN KEY ("picoId") REFERENCES "Pico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalIssue" ADD CONSTRAINT "PracticalIssue_picoId_fkey" FOREIGN KEY ("picoId") REFERENCES "Pico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtdFactor" ADD CONSTRAINT "EtdFactor_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtdJudgment" ADD CONSTRAINT "EtdJudgment_etdFactorId_fkey" FOREIGN KEY ("etdFactorId") REFERENCES "EtdFactor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmrElement" ADD CONSTRAINT "EmrElement_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidelineVersion" ADD CONSTRAINT "GuidelineVersion_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionPermission" ADD CONSTRAINT "VersionPermission_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "GuidelineVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalDocument" ADD CONSTRAINT "InternalDocument_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidelinePermission" ADD CONSTRAINT "GuidelinePermission_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidelinePermission" ADD CONSTRAINT "GuidelinePermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogEntry" ADD CONSTRAINT "ActivityLogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoiRecord" ADD CONSTRAINT "CoiRecord_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoiRecord" ADD CONSTRAINT "CoiRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoiInterventionConflict" ADD CONSTRAINT "CoiInterventionConflict_coiRecordId_fkey" FOREIGN KEY ("coiRecordId") REFERENCES "CoiRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoiDocument" ADD CONSTRAINT "CoiDocument_coiRecordId_fkey" FOREIGN KEY ("coiRecordId") REFERENCES "CoiRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackComment" ADD CONSTRAINT "FeedbackComment_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackComment" ADD CONSTRAINT "FeedbackComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FeedbackComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES "Guideline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionReference" ADD CONSTRAINT "SectionReference_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionReference" ADD CONSTRAINT "SectionReference_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionPico" ADD CONSTRAINT "SectionPico_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionPico" ADD CONSTRAINT "SectionPico_picoId_fkey" FOREIGN KEY ("picoId") REFERENCES "Pico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionRecommendation" ADD CONSTRAINT "SectionRecommendation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionRecommendation" ADD CONSTRAINT "SectionRecommendation_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PicoRecommendation" ADD CONSTRAINT "PicoRecommendation_picoId_fkey" FOREIGN KEY ("picoId") REFERENCES "Pico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PicoRecommendation" ADD CONSTRAINT "PicoRecommendation_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeReference" ADD CONSTRAINT "OutcomeReference_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "Outcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeReference" ADD CONSTRAINT "OutcomeReference_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationTag" ADD CONSTRAINT "RecommendationTag_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationTag" ADD CONSTRAINT "RecommendationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

