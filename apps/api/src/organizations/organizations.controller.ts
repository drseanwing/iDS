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

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

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
    description: 'Returns a paginated list of all organizations registered in the platform.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results per page' })
  @ApiResponse({ status: 200, description: 'Paginated list of organizations returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  findAll(@Query() pagination?: PaginationQueryDto) {
    return this.organizationsService.findAll(pagination?.page, pagination?.limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Returns the full details of a single organization identified by its UUID.',
  })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update organization',
    description: 'Updates the metadata (name, description, etc.) of an existing organization.',
  })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body – validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete organization',
    description: 'Permanently deletes an organization. This action cannot be undone and will also remove all associated guidelines.',
  })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Forbidden – insufficient permissions to delete this organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.remove(id);
  }
}
