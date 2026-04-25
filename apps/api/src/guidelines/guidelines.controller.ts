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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Create a new guideline',
    description:
      'Creates a new clinical practice guideline owned by the authenticated user. The guideline starts in DRAFT status.',
  })
  @ApiResponse({ status: 201, description: 'Guideline created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – insufficient role (requires AUTHOR or ADMIN)' })
  create(@Body() dto: CreateGuidelineDto, @Req() req: any) {
    return this.guidelinesService.create(dto, req.user?.sub);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Returns aggregate counts for guidelines, recommendations, and other entities. Can be scoped to a specific organization.',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter stats to a specific organization UUID' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  getStats(@Query('organizationId') organizationId?: string) {
    return this.guidelinesService.getDashboardStats(organizationId);
  }

  @Get()
  @ApiOperation({
    summary: 'List guidelines',
    description:
      'Returns a paginated list of clinical guidelines. Optionally filter by organization. Soft-deleted guidelines are excluded by default.',
  })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization UUID' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean, description: 'Include all items regardless of deletion status' })
  @ApiQuery({ name: 'onlyDeleted', required: false, type: Boolean, description: 'Show only soft-deleted items' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results per page' })
  @ApiResponse({ status: 200, description: 'Paginated list of guidelines returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
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
  @ApiOperation({
    summary: 'Get guideline by short name slug',
    description: 'Retrieves a guideline using its human-readable short name identifier (e.g. "who-hypertension-2023").',
  })
  @ApiParam({ name: 'shortName', description: 'Short name slug of the guideline' })
  @ApiResponse({ status: 200, description: 'Guideline returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Guideline with given slug not found' })
  findBySlug(@Param('shortName') shortName: string) {
    return this.guidelinesService.findBySlug(shortName);
  }

  @Get('by-slug/:shortName/latest')
  @ApiOperation({
    summary: 'Get the latest public version of a guideline by short name slug',
    description:
      'Returns the most recently published public version snapshot for the guideline identified by the given short name slug. Useful for public-facing readers.',
  })
  @ApiParam({ name: 'shortName', description: 'Short name slug of the guideline' })
  @ApiResponse({ status: 200, description: 'Latest public version returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Guideline not found or no public version available' })
  async findLatestPublicBySlug(@Param('shortName') shortName: string) {
    const guideline = await this.guidelinesService.findBySlug(shortName);
    return this.versionsService.findLatestPublicVersion(guideline.id);
  }

  @Get(':id/clinical-codes')
  @ApiOperation({
    summary: 'Get all clinical codes (PICO codes + EMR elements) for a guideline',
    description:
      'Aggregates all terminology codes (SNOMED CT, ICD-10, ATC, RxNorm) attached to PICOs and all EMR actionable elements attached to recommendations within the guideline.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'Clinical codes returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  findClinicalCodes(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.findClinicalCodes(id);
  }

  @Get(':id/validate')
  @ApiOperation({
    summary: 'Validate guideline data integrity (orphan links, missing metadata)',
    description:
      'Runs a set of integrity checks against the guideline: orphaned section links, recommendations without PICO associations, missing mandatory metadata fields, etc. Returns a list of validation issues.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'Validation completed – result contains any issues found' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  validate(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.validate(id);
  }

  @Get(':id/export')
  @ApiOperation({
    summary: 'Export complete guideline as JSON',
    description:
      'Downloads a complete JSON export of the guideline including all sections, recommendations, PICOs, outcomes, and references. The file is returned as an attachment.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'JSON export file returned as attachment (application/json)' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
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
  @ApiOperation({
    summary: 'Export complete guideline as a DOCX (Word) document',
    description:
      'Generates and downloads a Microsoft Word (.docx) document containing the full guideline narrative, recommendations, and supporting information formatted for review and publication.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'DOCX file returned as attachment (application/vnd.openxmlformats-officedocument.wordprocessingml.document)' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
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
  @ApiOperation({
    summary: 'Get guideline by ID',
    description: 'Returns the full record for a single guideline, including its current status, metadata, and associated organization.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'Guideline returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Update guideline',
    description: 'Updates the metadata and content fields of an existing guideline. Requires AUTHOR or ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'Guideline updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuidelineDto,
  ) {
    return this.guidelinesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Soft-delete guideline',
    description: 'Marks the guideline as deleted without permanently removing it from the database. Requires ADMIN role. The guideline can be restored.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'Guideline soft-deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
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
  @ApiResponse({ status: 201, description: 'Guideline imported successfully – new guideline record returned' })
  @ApiResponse({ status: 400, description: 'Invalid export payload – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN role' })
  importGuideline(
    @Body('exportData') exportData: any,
    @Body('organizationId') organizationId: string,
    @Req() req: any,
  ) {
    const userId: string = req.user?.sub;
    return this.guidelinesService.importGuideline(exportData, organizationId, userId);
  }

  @Post(':id/clone')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({
    summary: 'Clone a guideline (deep copy)',
    description:
      'Creates a full deep-copy of the guideline, including all sections (preserving the tree structure), ' +
      'references, recommendations (with EtD factors), and PICOs (with outcomes and codes). ' +
      'The new guideline title is prefixed with "COPY OF ", status is reset to DRAFT, ' +
      'and version history is not copied. The requesting user becomes the ADMIN owner.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID to clone' })
  @ApiResponse({ status: 201, description: 'Cloned guideline record returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires AUTHOR or ADMIN role' })
  @ApiResponse({ status: 404, description: 'Source guideline not found' })
  clone(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? 'system';
    return this.guidelinesService.clone(id, userId);
  }

  @Post(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Restore a soft-deleted guideline',
    description: 'Removes the soft-delete flag from a guideline, making it visible again in normal queries. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'Guideline restored successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.restore(id);
  }

  @Put(':id/public')
  @Roles('ADMIN')
  @UseGuards(RbacGuard)
  @ApiOperation({
    summary: 'Toggle public visibility of a guideline',
    description: 'Sets whether the guideline is publicly accessible without authentication. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'Public visibility updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  togglePublic(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isPublic') isPublic: boolean,
  ) {
    return this.guidelinesService.togglePublic(id, isPublic);
  }

  @Put(':id/status')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Transition guideline to a new status',
    description:
      'Moves the guideline through its authoring lifecycle: DRAFT → REVIEW → CONSULTATION → APPROVED → PUBLISHED → ARCHIVED. Each transition may enforce business rules.',
  })
  @ApiParam({ name: 'id', description: 'Guideline UUID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status value or disallowed transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.guidelinesService.updateStatus(id, status);
  }

  // ── Permission endpoints ──────────────────────────────────

  @Post(':id/permissions')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Add or update a permission on a guideline',
    description: 'Grants a user a specific role (VIEWER, REVIEWER, AUTHOR, ADMIN) on the guideline. If the user already has a permission, it is updated.',
  })
  @ApiParam({ name: 'id', description: 'Guideline ID' })
  @ApiResponse({ status: 201, description: 'Permission added or updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user ID or role value' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  addPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPermissionDto,
  ) {
    return this.guidelinesService.addPermission(id, dto.userId, dto.role);
  }

  @Get(':id/permissions')
  @ApiOperation({
    summary: 'List all permissions for a guideline',
    description: 'Returns the complete list of user-role assignments for the given guideline.',
  })
  @ApiParam({ name: 'id', description: 'Guideline ID' })
  @ApiResponse({ status: 200, description: 'Permissions list returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Guideline not found' })
  findPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.findPermissions(id);
  }

  @Delete(':id/permissions/:userId')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Remove a user permission from a guideline',
    description: 'Revokes all roles held by the specified user on the given guideline.',
  })
  @ApiParam({ name: 'id', description: 'Guideline ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 200, description: 'Permission removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Guideline or user permission not found' })
  removePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.guidelinesService.removePermission(id, userId);
  }
}
