import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGuidelineDto {
  @ApiProperty({ description: 'Guideline title' })
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ enum: ['PERSONAL', 'ORGANIZATIONAL', 'EVIDENCE_SUMMARY'] })
  @IsOptional()
  @IsEnum(['PERSONAL', 'ORGANIZATIONAL', 'EVIDENCE_SUMMARY'])
  guidelineType?: string;
}
