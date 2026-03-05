import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkSectionReferenceDto {
  @ApiProperty()
  @IsUUID()
  sectionId!: string;

  @ApiProperty()
  @IsUUID()
  referenceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;
}
