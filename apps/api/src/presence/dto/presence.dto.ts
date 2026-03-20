import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinDto {
  @ApiProperty({ description: 'Display name of the user joining' })
  @IsString()
  userName!: string;
}

export class HeartbeatDto {
  @ApiPropertyOptional({ description: 'Current section ID the user is viewing' })
  @IsOptional()
  @IsString()
  sectionId?: string;
}
