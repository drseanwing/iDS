import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkSectionPicoDto {
  @ApiProperty()
  @IsUUID()
  sectionId!: string;

  @ApiProperty()
  @IsUUID()
  picoId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;
}
