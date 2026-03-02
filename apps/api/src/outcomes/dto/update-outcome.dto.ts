import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateOutcomeDto } from './create-outcome.dto';

export class UpdateOutcomeDto extends PartialType(
  OmitType(CreateOutcomeDto, ['picoId'] as const),
) {}
