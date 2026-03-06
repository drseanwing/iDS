import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEtdFactorDto {
  @ApiPropertyOptional({ description: 'TipTap document JSON for summary text' })
  @IsOptional()
  summaryText?: any;

  @ApiPropertyOptional({ description: 'TipTap document JSON for research evidence' })
  @IsOptional()
  researchEvidence?: any;

  @ApiPropertyOptional({ description: 'TipTap document JSON for additional considerations' })
  @IsOptional()
  additionalConsiderations?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  summaryPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  evidencePublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  considerationsPublic?: boolean;
}
