import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

@ApiTags('Subscribers')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('guidelines/:guidelineId/subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Subscribe to a guideline (public endpoint)' })
  subscribe(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Body() dto: CreateSubscriberDto,
  ) {
    return this.subscribersService.subscribe(guidelineId, dto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List subscribers for a guideline (ADMIN only)' })
  findAll(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.subscribersService.findAll(guidelineId, pagination.page, pagination.limit);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove a subscriber (ADMIN only)' })
  remove(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscribersService.remove(guidelineId, id);
  }
}
