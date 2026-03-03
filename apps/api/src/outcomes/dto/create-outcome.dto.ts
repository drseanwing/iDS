import { IsString, IsOptional, IsUUID, IsEnum, IsInt, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum OutcomeType { DICHOTOMOUS = 'DICHOTOMOUS', CONTINUOUS = 'CONTINUOUS', NARRATIVE = 'NARRATIVE', QUALITATIVE_CERQUAL = 'QUALITATIVE_CERQUAL' }
enum EffectMeasure { RR = 'RR', OR = 'OR', HR = 'HR', MD = 'MD', SMD = 'SMD', PROTECTIVE_EFFICACY = 'PROTECTIVE_EFFICACY' }
enum CertaintyLevel { HIGH = 'HIGH', MODERATE = 'MODERATE', LOW = 'LOW', VERY_LOW = 'VERY_LOW' }
enum GradeRating { NOT_SERIOUS = 'NOT_SERIOUS', SERIOUS = 'SERIOUS', VERY_SERIOUS = 'VERY_SERIOUS' }
enum UpgradeRating { NONE = 'NONE', PRESENT = 'PRESENT', LARGE = 'LARGE', VERY_LARGE = 'VERY_LARGE' }

export class CreateOutcomeDto {
  @ApiProperty()
  @IsUUID()
  picoId!: string;

  @ApiProperty({ description: 'Outcome title' })
  @IsString()
  title!: string;

  @ApiProperty({ enum: OutcomeType, description: 'Type of outcome' })
  @IsEnum(OutcomeType)
  outcomeType!: OutcomeType;

  @ApiPropertyOptional({ description: 'Importance rating' })
  @IsOptional()
  @IsInt()
  importance?: number;

  @ApiPropertyOptional({ description: 'Display ordering' })
  @IsOptional()
  @IsInt()
  ordering?: number;

  @ApiPropertyOptional({ enum: EffectMeasure })
  @IsOptional()
  @IsEnum(EffectMeasure)
  effectMeasure?: EffectMeasure;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  relativeEffect?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  relativeEffectLower?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  relativeEffectUpper?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  baselineRisk?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  absoluteEffectIntervention?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  absoluteEffectComparison?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  interventionParticipants?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  comparisonParticipants?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  numberOfStudies?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  continuousUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  continuousScaleLower?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  continuousScaleUpper?: number;

  @ApiPropertyOptional({ enum: CertaintyLevel })
  @IsOptional()
  @IsEnum(CertaintyLevel)
  certaintyOverall?: CertaintyLevel;

  @ApiPropertyOptional({ enum: GradeRating })
  @IsOptional()
  @IsEnum(GradeRating)
  riskOfBias?: GradeRating;

  @ApiPropertyOptional({ enum: GradeRating })
  @IsOptional()
  @IsEnum(GradeRating)
  inconsistency?: GradeRating;

  @ApiPropertyOptional({ enum: GradeRating })
  @IsOptional()
  @IsEnum(GradeRating)
  indirectness?: GradeRating;

  @ApiPropertyOptional({ enum: GradeRating })
  @IsOptional()
  @IsEnum(GradeRating)
  imprecision?: GradeRating;

  @ApiPropertyOptional({ enum: GradeRating })
  @IsOptional()
  @IsEnum(GradeRating)
  publicationBias?: GradeRating;

  @ApiPropertyOptional({ enum: UpgradeRating })
  @IsOptional()
  @IsEnum(UpgradeRating)
  largeEffect?: UpgradeRating;

  @ApiPropertyOptional({ enum: UpgradeRating })
  @IsOptional()
  @IsEnum(UpgradeRating)
  doseResponse?: UpgradeRating;

  @ApiPropertyOptional({ enum: UpgradeRating })
  @IsOptional()
  @IsEnum(UpgradeRating)
  plausibleConfounding?: UpgradeRating;

  @ApiPropertyOptional({ description: 'Plain language summary' })
  @IsOptional()
  @IsString()
  plainLanguageSummary?: string;
}
