import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ description: 'Tag name (must be unique within the guideline)' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Hex color code, e.g. "#3B82F6"' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. "#3B82F6")' })
  color?: string;
}
