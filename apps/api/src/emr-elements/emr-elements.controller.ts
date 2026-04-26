import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EmrElementsService } from './emr-elements.service';
import { CreateEmrElementDto } from './dto/create-emr-element.dto';
import { UpdateEmrElementDto } from './dto/update-emr-element.dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('EMR Elements')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('recommendations/:recommendationId/emr-elements')
export class EmrElementsController {
  constructor(private readonly emrElementsService: EmrElementsService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Create an EMR element for a recommendation' })
  create(
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Body() dto: CreateEmrElementDto,
  ) {
    return this.emrElementsService.create({ ...dto, recommendationId });
  }

  @Get()
  @ApiOperation({ summary: 'List all EMR elements for a recommendation' })
  findByRecommendation(
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
  ) {
    return this.emrElementsService.findByRecommendation(recommendationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single EMR element' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.emrElementsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update an EMR element' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmrElementDto,
  ) {
    return this.emrElementsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Delete an EMR element' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.emrElementsService.remove(id);
  }
}
