import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum GuidelineRoleDto {
  ADMIN = 'ADMIN',
  AUTHOR = 'AUTHOR',
  REVIEWER = 'REVIEWER',
  VIEWER = 'VIEWER',
}

export class AddPermissionDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: GuidelineRoleDto })
  @IsEnum(GuidelineRoleDto)
  role!: GuidelineRoleDto;
}
