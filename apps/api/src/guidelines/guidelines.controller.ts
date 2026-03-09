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
  Res,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { GuidelinesService } from './guidelines.service';
import { WordExportService } from './word-export.service';
import { VersionsService } from '../versions/versions.service';
import { CreateGuidelineDto } from './dto/create-guideline.dto';
import { UpdateGuidelineDto } from './dto/update-guideline.dto';
import { AddPermissionDto } from './dto/manage-permission.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Guidelines')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('guidelines')
export class GuidelinesController {
  constructor(
    private readonly guidelinesService: GuidelinesService,
    private readonly wordExportService: WordExportService,
    private readonly versionsService: VersionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new guideline' })
  create(@Body() dto: CreateGuidelineDto, @Req() req: any) {
    return this.guidelinesService.create(dto, req.user?.sub);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiQuery({ name: 'organizationId', required: false })
  getStats(@Query('organizationId') organizationId?: string) {
    return this.guidelinesService.getDashboardStats(organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List guidelines' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean, description: 'Include all items regardless of deletion status' })
  @ApiQuery({ name: 'onlyDeleted', required: false, type: Boolean, description: 'Show only soft-deleted items' })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('onlyDeleted') onlyDeleted?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    let isDeleted: boolean | undefined = false;
    if (onlyDeleted === 'true') isDeleted = true;
    else if (includeDeleted === 'true') isDeleted = undefined;

    return this.guidelinesService.findAll(
      { organizationId, isDeleted },
      pagination?.page,
      pagination?.limit,
    );
  }

  @Get('by-slug/:shortName')
  @ApiOperation({ summary: 'Get guideline by short name slug' })
  @ApiParam({ name: 'shortName', description: 'Short name slug of the guideline' })
  findBySlug(@Param('shortName') shortName: string) {
    return this.guidelinesService.findBySlug(shortName);
  }

  @Get('by-slug/:shortName/latest')
  @ApiOperation({ summary: 'Get the latest public version of a guideline by short name slug' })
  @ApiParam({ name: 'shortName', description: 'Short name slug of the guideline' })
  async findLatestPublicBySlug(@Param('shortName') shortName: string) {
    const guideline = await this.guidelinesService.findBySlug(shortName);
    return this.versionsService.findLatestPublicVersion(guideline.id);
  }

  @Get(':id/clinical-codes')
  @ApiOperation({ summary: 'Get all clinical codes (PICO codes + EMR elements) for a guideline' })
  findClinicalCodes(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.findClinicalCodes(id);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: 'Validate guideline data integrity (orphan links, missing metadata)' })
  validate(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.validate(id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export complete guideline as JSON' })
  async exportJson(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const data = await this.guidelinesService.exportJson(id);
    const filename = `guideline-${data.guideline.shortName || id}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  }

  @Get(':id/export/docx')
  @ApiOperation({ summary: 'Export complete guideline as a DOCX (Word) document' })
  async exportDocx(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const data = await this.guidelinesService.exportJson(id);
    const buffer = await this.wordExportService.generateDocx(data);
    const filename = `guideline-${data.guideline.shortName || id}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guideline by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update guideline' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuidelineDto,
  ) {
    return this.guidelinesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete guideline' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.softDelete(id);
  }

  @Post('import')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Import/adapt a guideline from a JSON export',
    description:
      'Creates a new guideline (with sections and references) from an exported JSON payload. ' +
      'All IDs are regenerated. The title gets " (Imported)" appended.',
  })
  importGuideline(
    @Body('exportData') exportData: any,
    @Body('organizationId') organizationId: string,
    @Req() req: any,
  ) {
    const userId: string = req.user?.sub;
    return this.guidelinesService.importGuideline(exportData, organizationId, userId);
  }

  @Post(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Restore a soft-deleted guideline' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.restore(id);
  }

  @Put(':id/public')
  @Roles('ADMIN')
  @UseGuards(RbacGuard)
  @ApiOperation({ summary: 'Toggle public visibility of a guideline' })
  togglePublic(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isPublic') isPublic: boolean,
  ) {
    return this.guidelinesService.togglePublic(id, isPublic);
  }

  @Put(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Transition guideline to a new status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.guidelinesService.updateStatus(id, status);
  }

  // ── Permission endpoints ──────────────────────────────────

  @Post(':id/permissions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add or update a permission on a guideline' })
  @ApiParam({ name: 'id', description: 'Guideline ID' })
  addPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPermissionDto,
  ) {
    return this.guidelinesService.addPermission(id, dto.userId, dto.role);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'List all permissions for a guideline' })
  @ApiParam({ name: 'id', description: 'Guideline ID' })
  findPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.findPermissions(id);
  }

  @Delete(':id/permissions/:userId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove a user permission from a guideline' })
  @ApiParam({ name: 'id', description: 'Guideline ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  removePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.guidelinesService.removePermission(id, userId);
  }
}
