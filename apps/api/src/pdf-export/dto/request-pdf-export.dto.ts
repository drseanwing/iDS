import { IsOptional, IsInt, IsIn, IsBoolean, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RequestPdfExportDto {
  @ApiPropertyOptional({ description: 'PDF column layout (1 or 2)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  pdfColumnLayout?: number;

  @ApiPropertyOptional({ description: 'PICO display mode', enum: ['INLINE', 'ANNEX'] })
  @IsOptional()
  @IsIn(['INLINE', 'ANNEX'])
  picoDisplayMode?: string;

  @ApiPropertyOptional({ description: 'Whether to show section numbers', default: true })
  @IsOptional()
  @IsBoolean()
  showSectionNumbers?: boolean;

  @ApiPropertyOptional({ description: 'Whether to include table of contents', default: true })
  @IsOptional()
  @IsBoolean()
  includeTableOfContents?: boolean;

  @ApiPropertyOptional({ description: 'Cover page image URL' })
  @IsOptional()
  @IsString()
  coverPageUrl?: string;
}
