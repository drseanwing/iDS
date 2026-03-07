import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty()
  @IsUUID()
  recommendationId!: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for threaded replies' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content!: string;
}

export class UpdateCommentStatusDto {
  @ApiProperty({ enum: ['OPEN', 'RESOLVED', 'REJECTED'] })
  @IsEnum(['OPEN', 'RESOLVED', 'REJECTED'])
  status!: string;
}
