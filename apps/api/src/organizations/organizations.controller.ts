import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations' })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.remove(id);
  }
}
