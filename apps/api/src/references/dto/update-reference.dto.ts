import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateReferenceDto } from './create-reference.dto';

export class UpdateReferenceDto extends PartialType(
  OmitType(CreateReferenceDto, ['guidelineId'] as const),
) {}
