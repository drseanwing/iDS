import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization name' })
  @IsString()
  @MaxLength(500)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
