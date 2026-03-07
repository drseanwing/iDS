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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReferencesService } from './references.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('References')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('references')
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Create a reference' })
  create(@Body() dto: CreateReferenceDto) {
    return this.referencesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List references, optionally filtered by guideline or search term' })
  @ApiQuery({ name: 'guidelineId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('guidelineId') guidelineId?: string,
    @Query('search') search?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.referencesService.findAll(
      { guidelineId, search },
      pagination?.page,
      pagination?.limit,
    );
  }

  @Get('numbered')
  @ApiOperation({ summary: 'Get auto-numbered references for a guideline (depth-first traversal order)' })
  @ApiQuery({ name: 'guidelineId', required: true })
  async getNumbered(@Query('guidelineId', ParseUUIDPipe) guidelineId: string) {
    const numberMap = await this.referencesService.computeReferenceNumbers(guidelineId);
    const data = Array.from(numberMap.entries()).map(([referenceId, referenceNumber]) => ({
      referenceId,
      referenceNumber,
    }));
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reference by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.referencesService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update reference' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferenceDto,
  ) {
    return this.referencesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Soft-delete reference' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.referencesService.softDelete(id);
  }
}
