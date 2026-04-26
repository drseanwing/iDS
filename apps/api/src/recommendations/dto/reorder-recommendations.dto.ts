import { IsArray, IsUUID, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderItemDto {
  @ApiProperty() @IsUUID() id!: string;
  @ApiProperty() @IsInt() ordering!: number;
}

export class ReorderRecommendationsDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReorderItemDto)
  recommendations!: ReorderItemDto[];
}
