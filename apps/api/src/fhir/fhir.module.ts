import { Module } from '@nestjs/common';
import { FhirController } from './fhir.controller';
import { GuidelineCompositionProjection } from './projections/guideline-to-composition';
import { ReferenceCitationProjection } from './projections/reference-to-citation';
import { RecommendationPlanDefinitionProjection } from './projections/recommendation-to-plan-definition';
import { PicoEvidenceProjection } from './projections/pico-to-evidence';
import { FhirValidationService } from './fhir-validation.service';
import { PrismaModule } from '../prisma/prisma.module';

const projections = [
  GuidelineCompositionProjection,
  ReferenceCitationProjection,
  RecommendationPlanDefinitionProjection,
  PicoEvidenceProjection,
];

@Module({
  imports: [PrismaModule],
  controllers: [FhirController],
  providers: [...projections, FhirValidationService],
  exports: [...projections, FhirValidationService],
})
export class FhirModule {}
