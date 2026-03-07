import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CATEGORIES = [
  'MEDICATION_ROUTINE', 'TESTS_AND_VISITS', 'PROCEDURE_AND_DEVICE',
  'RECOVERY_AND_ADAPTATION', 'COORDINATION_OF_CARE', 'ADVERSE_EFFECTS',
  'INTERACTIONS_AND_ANTIDOTE', 'PHYSICAL_WELLBEING', 'EMOTIONAL_WELLBEING',
  'PREGNANCY_AND_NURSING', 'COSTS_AND_ACCESS', 'FOOD_AND_DRINKS',
  'EXERCISE_AND_ACTIVITIES', 'SOCIAL_LIFE_AND_RELATIONSHIPS',
  'WORK_AND_EDUCATION', 'TRAVEL_AND_DRIVING',
] as const;

export class CreatePracticalIssueDto {
  @ApiProperty({ enum: CATEGORIES, description: 'Practical issue category' })
  @IsEnum(CATEGORIES)
  category!: string;

  @ApiProperty({ description: 'Issue title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Rich-text description (TipTap JSON)' })
  @IsOptional()
  description?: any;

  @ApiPropertyOptional({ description: 'Display ordering', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;
}
