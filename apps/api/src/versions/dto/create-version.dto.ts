import { IsString, IsOptional, IsEnum, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVersionDto {
  @ApiProperty()
  @IsUUID()
  guidelineId!: string;

  @ApiProperty({ enum: ['MAJOR', 'MINOR'] })
  @IsEnum(['MAJOR', 'MINOR'])
  versionType!: string;

  @ApiPropertyOptional({ description: 'Version comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Make this version publicly visible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
