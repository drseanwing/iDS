import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecommendationDto {
  @ApiProperty()
  @IsUUID()
  guidelineId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'TipTap document JSON for recommendation text' })
  description!: any;

  @ApiPropertyOptional({ description: 'TipTap document JSON for remark (critical info shown at top)' })
  @IsOptional()
  remark?: any;

  @ApiPropertyOptional({ description: 'TipTap document JSON for rationale/justification' })
  @IsOptional()
  rationale?: any;

  @ApiPropertyOptional({ description: 'TipTap document JSON for practical information' })
  @IsOptional()
  practicalInfo?: any;

  @ApiPropertyOptional({ enum: ['STRONG_FOR', 'CONDITIONAL_FOR', 'CONDITIONAL_AGAINST', 'STRONG_AGAINST', 'NOT_SET'] })
  @IsOptional()
  @IsEnum(['STRONG_FOR', 'CONDITIONAL_FOR', 'CONDITIONAL_AGAINST', 'STRONG_AGAINST', 'NOT_SET'])
  strength?: string;

  @ApiPropertyOptional({ enum: ['GRADE', 'PRACTICE_STATEMENT', 'STATUTORY', 'INFO_BOX', 'CONSENSUS', 'NO_LABEL'] })
  @IsOptional()
  @IsEnum(['GRADE', 'PRACTICE_STATEMENT', 'STATUTORY', 'INFO_BOX', 'CONSENSUS', 'NO_LABEL'])
  recommendationType?: string;

  @ApiPropertyOptional({ description: 'FHIR metadata JSON (e.g. PlanDefinition resource mapping)' })
  @IsOptional()
  fhirMeta?: any;
}
