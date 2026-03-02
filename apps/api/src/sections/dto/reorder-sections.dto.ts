import { IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SectionOrder {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  ordering!: number;
}

export class ReorderSectionsDto {
  @ApiProperty({ type: [SectionOrder] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionOrder)
  sections!: SectionOrder[];
}
