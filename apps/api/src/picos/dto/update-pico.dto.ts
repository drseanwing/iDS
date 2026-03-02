import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePicoDto } from './create-pico.dto';

export class UpdatePicoDto extends PartialType(
  OmitType(CreatePicoDto, ['guidelineId'] as const),
) {}
