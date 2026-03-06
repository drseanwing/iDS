import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEtdJudgmentDto {
  @ApiProperty({ description: 'Intervention label for this judgment' })
  @IsString()
  interventionLabel!: string;
}
