import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, MaxLength, Min, Max } from 'class-validator';
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

  @ApiPropertyOptional({ enum: ['FOUR_FACTOR', 'SEVEN_FACTOR', 'TWELVE_FACTOR'], description: 'EtD framework mode' })
  @IsOptional()
  @IsEnum(['FOUR_FACTOR', 'SEVEN_FACTOR', 'TWELVE_FACTOR'])
  etdMode?: string;

  @ApiPropertyOptional({ description: 'Show sequential section numbers in the section tree' })
  @IsOptional()
  @IsBoolean()
  showSectionNumbers?: boolean;

  @ApiPropertyOptional({ description: 'Show GRADE certainty level inside the strength label' })
  @IsOptional()
  @IsBoolean()
  showCertaintyInLabel?: boolean;

  @ApiPropertyOptional({ description: 'Show GRADE description text alongside certainty symbols' })
  @IsOptional()
  @IsBoolean()
  showGradeDescription?: boolean;

  @ApiPropertyOptional({ description: 'Enable track-changes mode in TipTap editors by default' })
  @IsOptional()
  @IsBoolean()
  trackChangesDefault?: boolean;

  @ApiPropertyOptional({ description: 'Allow guideline subscribers to sign up for update notifications' })
  @IsOptional()
  @IsBoolean()
  enableSubscriptions?: boolean;

  @ApiPropertyOptional({ description: 'Allow public readers to submit feedback comments' })
  @IsOptional()
  @IsBoolean()
  enablePublicComments?: boolean;

  @ApiPropertyOptional({ description: 'Show section text preview in the section tree sidebar' })
  @IsOptional()
  @IsBoolean()
  showSectionTextPreview?: boolean;

  @ApiPropertyOptional({ description: 'PDF column layout: 1 (single) or 2 (two-column)', minimum: 1, maximum: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  pdfColumnLayout?: number;

  @ApiPropertyOptional({ enum: ['INLINE', 'ANNEX'], description: 'How PICOs are displayed in PDF/public view' })
  @IsOptional()
  @IsEnum(['INLINE', 'ANNEX'])
  picoDisplayMode?: string;

  @ApiPropertyOptional({ description: 'URL of the cover page image for PDF export' })
  @IsOptional()
  @IsString()
  coverPageUrl?: string;

  @ApiPropertyOptional({ description: 'Make this guideline publicly visible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
