import { PartialType } from '@nestjs/swagger';
import { CreateGuidelineDto } from './create-guideline.dto';

export class UpdateGuidelineDto extends PartialType(CreateGuidelineDto) {}
