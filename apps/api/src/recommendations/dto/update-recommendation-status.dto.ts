import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RecStatusDto {
  NEW = 'NEW',
  UPDATED = 'UPDATED',
  IN_REVIEW = 'IN_REVIEW',
  POSSIBLY_OUTDATED = 'POSSIBLY_OUTDATED',
  UPDATED_EVIDENCE = 'UPDATED_EVIDENCE',
  REVIEWED = 'REVIEWED',
  NO_LABEL = 'NO_LABEL',
}

export class UpdateRecommendationStatusDto {
  @ApiProperty({ enum: RecStatusDto })
  @IsEnum(RecStatusDto)
  status!: RecStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
