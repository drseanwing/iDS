import {
  IsString,
  IsUUID,
  IsArray,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsNumber,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RevManOutcomeType {
  DICHOTOMOUS = 'DICHOTOMOUS',
  CONTINUOUS = 'CONTINUOUS',
}

export class RevManStudyDto {
  @ApiProperty({ description: 'Study identifier / label' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ description: 'Number of events in intervention arm (dichotomous)' })
  @IsOptional()
  @IsInt()
  eventsIntervention?: number;

  @ApiPropertyOptional({ description: 'Total participants in intervention arm' })
  @IsOptional()
  @IsInt()
  totalIntervention?: number;

  @ApiPropertyOptional({ description: 'Number of events in control arm (dichotomous)' })
  @IsOptional()
  @IsInt()
  eventsControl?: number;

  @ApiPropertyOptional({ description: 'Total participants in control arm' })
  @IsOptional()
  @IsInt()
  totalControl?: number;

  @ApiPropertyOptional({ description: 'Mean in intervention arm (continuous)' })
  @IsOptional()
  @IsNumber()
  meanIntervention?: number;

  @ApiPropertyOptional({ description: 'Mean in control arm (continuous)' })
  @IsOptional()
  @IsNumber()
  meanControl?: number;
}

export class RevManOverallEffectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  effect?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ciLower?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ciUpper?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  totalStudies?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  totalParticipants?: number;
}

export class RevManOutcomeDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: RevManOutcomeType })
  @IsEnum(RevManOutcomeType)
  type!: RevManOutcomeType;

  @ApiPropertyOptional({ type: [RevManStudyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RevManStudyDto)
  studies?: RevManStudyDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => RevManOverallEffectDto)
  overallEffect?: RevManOverallEffectDto;
}

export class RevManComparisonDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ type: [RevManOutcomeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RevManOutcomeDto)
  outcomes?: RevManOutcomeDto[];
}

export class ImportRevManDto {
  @ApiProperty({ description: 'Target guideline ID' })
  @IsUUID()
  guidelineId!: string;

  @ApiProperty({ description: 'Target PICO ID to attach outcomes to' })
  @IsUUID()
  picoId!: string;

  @ApiProperty({ type: [RevManComparisonDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RevManComparisonDto)
  comparisons!: RevManComparisonDto[];
}
