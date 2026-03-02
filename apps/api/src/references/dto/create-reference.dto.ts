import { IsString, IsOptional, IsUUID, IsInt, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferenceDto {
  @ApiProperty()
  @IsUUID()
  guidelineId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authors?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abstract?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pubmedId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ enum: ['PRIMARY_STUDY', 'SYSTEMATIC_REVIEW', 'OTHER'] })
  @IsOptional()
  @IsEnum(['PRIMARY_STUDY', 'SYSTEMATIC_REVIEW', 'OTHER'])
  studyType?: string;
}
