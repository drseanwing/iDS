import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GuidelinesService } from './guidelines.service';
import { CreateGuidelineDto } from './dto/create-guideline.dto';
import { UpdateGuidelineDto } from './dto/update-guideline.dto';

@ApiTags('Guidelines')
@ApiBearerAuth()
@Controller('guidelines')
export class GuidelinesController {
  constructor(private readonly guidelinesService: GuidelinesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new guideline' })
  create(@Body() dto: CreateGuidelineDto, @Req() req: any) {
    return this.guidelinesService.create(dto, req.user?.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List guidelines' })
  @ApiQuery({ name: 'organizationId', required: false })
  findAll(@Query('organizationId') organizationId?: string) {
    return this.guidelinesService.findAll({ organizationId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guideline by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update guideline' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuidelineDto,
  ) {
    return this.guidelinesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete guideline' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.softDelete(id);
  }
}
