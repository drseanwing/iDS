import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePicoCodeDto {
  @ApiProperty({ enum: ['SNOMED_CT', 'ICD10', 'ATC', 'RXNORM'], description: 'Terminology code system' })
  @IsEnum(['SNOMED_CT', 'ICD10', 'ATC', 'RXNORM'])
  codeSystem!: string;

  @ApiProperty({ description: 'Code value' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Human-readable display label' })
  @IsString()
  display!: string;

  @ApiProperty({ enum: ['POPULATION', 'INTERVENTION', 'COMPARATOR', 'OUTCOME'], description: 'PICO element this code tags' })
  @IsEnum(['POPULATION', 'INTERVENTION', 'COMPARATOR', 'OUTCOME'])
  element!: string;
}
