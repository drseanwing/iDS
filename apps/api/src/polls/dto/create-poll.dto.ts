import { IsString, IsOptional, IsUUID, IsEnum, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PollOptionDto {
  @ApiProperty({ description: 'Label for this poll option' })
  @IsString()
  label!: string;

  @ApiPropertyOptional({ description: 'Display ordering' })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;
}

export class CreatePollDto {
  @ApiProperty({ description: 'Guideline this poll belongs to' })
  @IsUUID()
  guidelineId!: string;

  @ApiPropertyOptional({ description: 'Optional recommendation this poll is linked to' })
  @IsOptional()
  @IsUUID()
  recommendationId?: string;

  @ApiProperty({ description: 'Poll title' })
  @IsString()
  title!: string;

  @ApiProperty({ enum: ['OPEN_TEXT', 'MULTIPLE_CHOICE', 'STRENGTH_VOTE', 'ETD_JUDGMENT'] })
  @IsEnum(['OPEN_TEXT', 'MULTIPLE_CHOICE', 'STRENGTH_VOTE', 'ETD_JUDGMENT'])
  pollType!: string;

  @ApiPropertyOptional({
    description: 'Poll options (for MULTIPLE_CHOICE, STRENGTH_VOTE, ETD_JUDGMENT)',
    type: [PollOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options?: PollOptionDto[];
}

export class CastVoteDto {
  @ApiProperty({ description: 'Vote value (JSON — option label, text, or structured data)' })
  value!: any;

  @ApiPropertyOptional({ description: 'Optional comment with the vote' })
  @IsOptional()
  @IsString()
  comment?: string;
}
