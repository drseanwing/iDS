import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkCoiDto {
  @ApiProperty({
    description: 'Bulk operation mode: set conflicts per-intervention or per-member',
    enum: ['per-intervention', 'per-member'],
  })
  @IsEnum(['per-intervention', 'per-member'])
  mode!: 'per-intervention' | 'per-member';

  @ApiPropertyOptional({
    description: 'Intervention label to target (required for per-intervention mode)',
  })
  @IsOptional()
  @IsString()
  interventionLabel?: string;

  @ApiPropertyOptional({
    description: 'COI record ID to target (required for per-member mode)',
  })
  @IsOptional()
  @IsUUID()
  coiRecordId?: string;

  @ApiProperty({
    description: 'Conflict level to set for all matched records',
    enum: ['NONE', 'LOW', 'MODERATE', 'HIGH'],
  })
  @IsString()
  conflictLevel!: string;
}
