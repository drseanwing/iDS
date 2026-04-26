import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EmrElementType, CodeSystem } from '@prisma/client';

export class CreateEmrElementDto {
  @ApiProperty({ description: 'UUID of the parent recommendation' })
  @IsUUID()
  recommendationId!: string;

  @ApiProperty({ enum: EmrElementType, description: 'Type of EMR element' })
  @IsEnum(EmrElementType)
  elementType!: EmrElementType;

  @ApiPropertyOptional({ description: 'Clinical code (e.g. SNOMED CT concept ID)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    enum: CodeSystem,
    description: 'Code system (e.g. SNOMED_CT, RXNORM)',
  })
  @IsOptional()
  @IsEnum(CodeSystem)
  codeSystem?: CodeSystem;

  @ApiProperty({ description: 'Human-readable display text for the element' })
  @IsString()
  display!: string;

  @ApiPropertyOptional({
    enum: ['ROUTINE', 'URGENT', 'STAT'],
    description: 'Clinical priority of the action',
  })
  @IsOptional()
  @IsEnum(['ROUTINE', 'URGENT', 'STAT'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Additional implementation notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEmrElementDto extends PartialType(CreateEmrElementDto) {}
