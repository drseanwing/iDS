import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkSectionRecommendationDto {
  @ApiProperty()
  @IsUUID()
  sectionId!: string;

  @ApiProperty()
  @IsUUID()
  recommendationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;
}
