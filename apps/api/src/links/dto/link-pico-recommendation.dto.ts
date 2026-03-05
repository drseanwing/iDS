import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkPicoRecommendationDto {
  @ApiProperty()
  @IsUUID()
  picoId!: string;

  @ApiProperty()
  @IsUUID()
  recommendationId!: string;
}
