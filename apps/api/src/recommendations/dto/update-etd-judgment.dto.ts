import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEtdJudgmentDto {
  @ApiPropertyOptional({ description: 'The judgment value (factor-specific option)' })
  @IsOptional()
  @IsString()
  judgment?: string;

  @ApiPropertyOptional({ description: 'Hex color code for visual display' })
  @IsOptional()
  @IsString()
  colorCode?: string;
}
