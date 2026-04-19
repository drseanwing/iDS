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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateChecklistItemDto,
  ToggleChecklistItemDto,
} from './dto/create-milestone.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('Milestones')
@ApiBearerAuth()
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  // ── Milestones ──────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a milestone' })
  create(@Body() dto: CreateMilestoneDto, @CurrentUserId() userId: string) {
    return this.milestonesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List milestones and checklist items for a guideline' })
  @ApiQuery({ name: 'guidelineId', required: true })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
  ) {
    return this.milestonesService.findByGuideline(guidelineId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a milestone' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a milestone' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.milestonesService.remove(id);
  }

  // ── Checklist Items ─────────────────────────────────────────

  @Post(':id/items')
  @ApiOperation({ summary: 'Add a checklist item to a guideline' })
  addChecklistItem(
    @Param('id', ParseUUIDPipe) _milestoneId: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.milestonesService.addChecklistItem(dto);
  }

  @Put('items/:itemId/toggle')
  @ApiOperation({ summary: 'Toggle checklist item completion' })
  toggleChecklistItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ToggleChecklistItemDto,
    @CurrentUserId() userId: string,
  ) {
    return this.milestonesService.toggleChecklistItem(
      itemId,
      dto.isChecked,
      userId,
    );
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Delete a checklist item' })
  removeChecklistItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.milestonesService.removeChecklistItem(itemId);
  }
}
