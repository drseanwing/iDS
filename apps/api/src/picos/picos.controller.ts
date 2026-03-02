import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PicosService } from './picos.service';
import { CreatePicoDto } from './dto/create-pico.dto';
import { UpdatePicoDto } from './dto/update-pico.dto';

@ApiTags('PICOs')
@ApiBearerAuth()
@Controller('picos')
export class PicosController {
  constructor(private readonly picosService: PicosService) {}

  @Post()
  @ApiOperation({ summary: 'Create a PICO question' })
  create(@Body() dto: CreatePicoDto) {
    return this.picosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List PICOs by guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(@Query('guidelineId', ParseUUIDPipe) guidelineId: string) {
    return this.picosService.findByGuideline(guidelineId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get PICO by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.picosService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update PICO' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePicoDto,
  ) {
    return this.picosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete PICO' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.picosService.softDelete(id);
  }
}
