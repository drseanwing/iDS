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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Create a task' })
  create(@Body() dto: CreateTaskDto) {
    // TODO: extract userId from JWT when auth is wired
    const userId = '00000000-0000-0000-0000-000000000001';
    return this.tasksService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks for a guideline (filterable, paginated)' })
  @ApiQuery({ name: 'guidelineId', required: true })
  @ApiQuery({ name: 'status', required: false, enum: ['TODO', 'IN_PROGRESS', 'DONE'] })
  @ApiQuery({ name: 'assigneeId', required: false })
  findByGuideline(
    @Query('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.tasksService.findByGuideline(
      guidelineId,
      { status, assigneeId },
      pagination?.page,
      pagination?.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task with assignee info' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    // TODO: extract userId from JWT when auth is wired
    const userId = '00000000-0000-0000-0000-000000000001';
    return this.tasksService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.remove(id);
  }
}
