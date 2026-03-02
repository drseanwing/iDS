import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePicoDto {
  @ApiProperty()
  @IsUUID()
  guidelineId!: string;

  @ApiProperty({ description: 'Population' })
  @IsString()
  population!: string;

  @ApiProperty({ description: 'Intervention' })
  @IsString()
  intervention!: string;

  @ApiProperty({ description: 'Comparator' })
  @IsString()
  comparator!: string;

  @ApiPropertyOptional({ description: 'Narrative summary (TipTap JSON)' })
  @IsOptional()
  narrativeSummary?: any;
}
