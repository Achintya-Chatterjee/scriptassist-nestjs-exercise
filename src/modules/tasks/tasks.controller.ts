import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Task } from './entities/task.entity';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { PaginatedResponse } from 'src/types/pagination.interface';
import { TaskOwnershipGuard } from './guards/task-ownership.guard';
import { BatchTaskDto } from './dto/batch-task.dto';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Creates a new task for the current user.
   * @param createTaskDto - The data to create the task.
   * @returns The newly created task.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(createTaskDto);
  }

  /**
   * Finds all tasks, filtered by ownership for non-admins.
   * @param filterDto - The filtering and pagination options.
   * @returns A list of tasks and pagination metadata.
   */
  @Get()
  @ApiOperation({ summary: 'Find all tasks with optional filtering' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query() filterDto: TaskFilterDto): Promise<PaginatedResponse<TaskResponseDto>> {
    return this.tasksService.findAll(filterDto);
  }

  /**
   * Retrieves statistics about the tasks.
   * @returns An object containing task statistics.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  async getStats() {
    return this.tasksService.getStats();
  }

  /**
   * Finds a single task by its ID, protected by ownership.
   * @param id - The ID of the task to find.
   * @returns The found task.
   */
  @Get(':id')
  @UseGuards(TaskOwnershipGuard)
  @ApiOperation({ summary: 'Find a task by ID' })
  async findOne(@Param('id') id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }

  /**
   * Updates a task, protected by ownership.
   * @param id - The ID of the task to update.
   * @param updateTaskDto - The data to update the task with.
   * @returns The updated task.
   */
  @Patch(':id')
  @UseGuards(TaskOwnershipGuard)
  @ApiOperation({ summary: 'Update a task' })
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto): Promise<Task> {
    return this.tasksService.update(id, updateTaskDto);
  }

  /**
   * Deletes a task, protected by ownership.
   * @param id - The ID of the task to delete.
   */
  @Delete(':id')
  @UseGuards(TaskOwnershipGuard)
  @ApiOperation({ summary: 'Delete a task' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tasksService.remove(id);
  }

  /**
   * Processes multiple tasks in a batch.
   * @param operations - The batch operations to perform.
   * @returns The results of the batch operations.
   */
  @Post('batch')
  @ApiOperation({ summary: 'Batch process multiple tasks' })
  async batchProcess(@Body() operations: BatchTaskDto) {
    return this.tasksService.batchProcess(operations);
  }
}
