import { IsString, IsOptional, IsUUID, IsBoolean, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCoiDto {
  @ApiProperty({ description: 'Guideline this COI record belongs to' })
  @IsUUID()
  guidelineId!: string;

  @ApiPropertyOptional({ description: 'Public-facing disclosure summary' })
  @IsOptional()
  @IsString()
  publicSummary?: string;

  @ApiPropertyOptional({ description: 'Internal-only disclosure summary' })
  @IsOptional()
  @IsString()
  internalSummary?: string;

  @ApiPropertyOptional({
    description: 'Intervention-level conflicts as JSON array',
    example: [{ interventionLabel: 'Drug A', conflictLevel: 'LOW', excludeFromVoting: false }],
  })
  @IsOptional()
  interventionConflicts?: Array<{
    interventionLabel: string;
    conflictLevel?: string;
    internalComment?: string;
    excludeFromVoting?: boolean;
    isPublic?: boolean;
  }>;
}

export class UpdateCoiDto extends PartialType(CreateCoiDto) {}
