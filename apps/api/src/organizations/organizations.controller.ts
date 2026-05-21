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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { PaginationQueryDto } from '../common/dto';
import { CurrentUserId } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new organization',
    description: 'Creates a new organization that can own clinical guidelines. Requires an authenticated user with administrative privileges.',
  })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 409, description: 'Conflict – an organization with that name or identifier already exists' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List organizations',
    description: 'Returns a paginated list of organizations the authenticated user is a member of.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results per page' })
  @ApiResponse({ status: 200, description: 'Paginated list of organizations returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  findAll(
    @CurrentUserId() userId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.organizationsService.findAll(pagination?.page, pagination?.limit, userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Returns the full details of a single organization. Caller must be a member.',
  })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – caller is not a member of this organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { organizationId: id, userId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    return this.organizationsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update organization',
    description: 'Updates the metadata of an existing organization. Restricted to organization admins.',
  })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – only organization admins can update' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUserId() userId: string,
  ) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { organizationId: id, userId, role: 'ADMIN' },
    });
    if (!membership) {
      throw new ForbiddenException('Only organization admins can update organizations');
    }
    return this.organizationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete organization',
    description: 'Permanently deletes an organization. This action cannot be undone and will also remove all associated guidelines. Restricted to users with the ADMIN role on the organization.',
  })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – insufficient permissions to delete this organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { organizationId: id, userId, role: 'ADMIN' },
    });
    if (!membership) {
      throw new ForbiddenException(
        'Only organization admins can delete organizations',
      );
    }
    return this.organizationsService.remove(id);
  }
}
