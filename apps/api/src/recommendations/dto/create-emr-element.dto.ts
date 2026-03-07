import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmrElementDto {
  @ApiProperty({ enum: ['TARGET_POPULATION', 'INTERVENTION'], description: 'Type of EMR element' })
  @IsEnum(['TARGET_POPULATION', 'INTERVENTION'])
  elementType!: string;

  @ApiProperty({ enum: ['SNOMED_CT', 'ICD10', 'ATC', 'RXNORM'], description: 'Terminology code system' })
  @IsEnum(['SNOMED_CT', 'ICD10', 'ATC', 'RXNORM'])
  codeSystem!: string;

  @ApiProperty({ description: 'Code value' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Human-readable display label' })
  @IsString()
  display!: string;

  @ApiPropertyOptional({ description: 'Implementation description for EHR integration' })
  @IsOptional()
  @IsString()
  implementationDescription?: string;
}
