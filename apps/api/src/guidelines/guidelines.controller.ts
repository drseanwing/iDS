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
  constructor(private readonly guidelinesService: GuidelinesService) {}

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
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.guidelinesService.findAll(
      { organizationId },
      pagination?.page,
      pagination?.limit,
    );
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

  @Post(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Restore a soft-deleted guideline' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidelinesService.restore(id);
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
