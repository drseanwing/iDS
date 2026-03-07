import { IsString, IsOptional, IsUUID, IsInt, IsBoolean, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateMilestoneDto {
  @ApiProperty()
  @IsUUID()
  guidelineId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsiblePerson?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;
}

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}

export class CreateChecklistItemDto {
  @ApiProperty()
  @IsUUID()
  guidelineId!: string;

  @ApiProperty({ description: 'Category grouping (e.g. AGREE_II, SNAP_IT)' })
  @IsString()
  category!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;
}

export class ToggleChecklistItemDto {
  @ApiProperty()
  @IsBoolean()
  isChecked!: boolean;
}
