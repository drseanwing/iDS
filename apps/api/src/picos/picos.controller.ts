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
import { PicosService } from './picos.service';
import { CreatePicoDto } from './dto/create-pico.dto';
import { UpdatePicoDto } from './dto/update-pico.dto';
import { CreatePicoCodeDto } from './dto/create-pico-code.dto';
import { CreatePracticalIssueDto } from './dto/create-practical-issue.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('PICOs')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('picos')
export class PicosController {
  constructor(private readonly picosService: PicosService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Create a PICO question' })
  create(@Body() dto: CreatePicoDto) {
    return this.picosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List PICOs by guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.picosService.findByGuideline(guidelineId, pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get PICO by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.picosService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update PICO' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePicoDto,
  ) {
    return this.picosService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Soft-delete PICO' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.picosService.softDelete(id);
  }

  // ── PICO Codes ──────────────────────────────────────────────

  @Post(':picoId/codes')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Add a terminology code to a PICO element' })
  addCode(
    @Param('picoId', ParseUUIDPipe) picoId: string,
    @Body() dto: CreatePicoCodeDto,
  ) {
    return this.picosService.addCode(picoId, dto);
  }

  @Delete(':picoId/codes/:codeId')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Remove a terminology code from a PICO' })
  removeCode(
    @Param('picoId', ParseUUIDPipe) picoId: string,
    @Param('codeId', ParseUUIDPipe) codeId: string,
  ) {
    return this.picosService.removeCode(picoId, codeId);
  }

  // ── Practical Issues ──────────────────────────────────────────────

  @Post(':picoId/practical-issues')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Add a practical issue to a PICO' })
  addPracticalIssue(
    @Param('picoId', ParseUUIDPipe) picoId: string,
    @Body() dto: CreatePracticalIssueDto,
  ) {
    return this.picosService.addPracticalIssue(picoId, dto);
  }

  @Put(':picoId/practical-issues/:issueId')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update a practical issue' })
  updatePracticalIssue(
    @Param('picoId', ParseUUIDPipe) picoId: string,
    @Param('issueId', ParseUUIDPipe) issueId: string,
    @Body() dto: CreatePracticalIssueDto,
  ) {
    return this.picosService.updatePracticalIssue(picoId, issueId, dto);
  }

  @Delete(':picoId/practical-issues/:issueId')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Remove a practical issue from a PICO' })
  removePracticalIssue(
    @Param('picoId', ParseUUIDPipe) picoId: string,
    @Param('issueId', ParseUUIDPipe) issueId: string,
  ) {
    return this.picosService.removePracticalIssue(picoId, issueId);
  }
}
