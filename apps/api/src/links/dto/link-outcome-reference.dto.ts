import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkOutcomeReferenceDto {
  @ApiProperty()
  @IsUUID()
  outcomeId!: string;

  @ApiProperty()
  @IsUUID()
  referenceId!: string;
}
