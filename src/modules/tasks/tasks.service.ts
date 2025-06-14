import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';
import { TaskFilterDto } from './dto/task-filter.dto';
import { PaginatedResponse } from 'src/types/pagination.interface';
import { TaskResponseDto } from './dto/task-response.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateTaskCommand } from './commands/create-task.command';
import { UpdateTaskCommand } from './commands/update-task.command';
import { DeleteTaskCommand } from './commands/delete-task.command';
import { BatchProcessTasksCommand } from './commands/batch-process-tasks.command';
import { GetAllTasksQuery } from './queries/get-all-tasks.query';
import { GetTaskByIdQuery } from './queries/get-task-by-id.query';
import { GetTaskStatsQuery } from './queries/get-task-stats.query';
import { TaskStatsDto } from './dto/task-stats.dto';
import { BatchTaskDto } from './dto/batch-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Creates a new task for a specific user.
   * This operation is wrapped in a transaction to ensure atomicity.
   * @param createTaskDto - The data for creating the new task.
   * @returns The created task entity.
   */
  create(createTaskDto: CreateTaskDto): Promise<Task> {
    return this.commandBus.execute(new CreateTaskCommand(createTaskDto));
  }

  /**
   * Retrieves a paginated and filtered list of tasks, respecting user ownership.
   * @param filterDto - DTO containing filter and pagination parameters.
   * @returns A paginated list of tasks.
   */
  findAll(filterDto: TaskFilterDto): Promise<PaginatedResponse<TaskResponseDto>> {
    return this.queryBus.execute(new GetAllTasksQuery(filterDto));
  }

  /**
   * Finds a single task by its ID.
   * Throws a NotFoundException if the task doesn't exist.
   * @param id - The UUID of the task.
   * @returns The found task entity.
   */
  findOne(id: string): Promise<Task> {
    return this.queryBus.execute(new GetTaskByIdQuery(id));
  }

  /**
   * Updates a task's properties.
   * Throws a NotFoundException if the task doesn't exist.
   * @param id - The UUID of the task to update.
   * @param updateTaskDto - The new data for the task.
   * @returns The updated task entity.
   */
  update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    return this.commandBus.execute(new UpdateTaskCommand(id, updateTaskDto));
  }

  /**
   * Deletes a task by its ID.
   * Throws a NotFoundException if the task doesn't exist.
   * @param id - The UUID of the task to delete.
   */
  remove(id: string): Promise<void> {
    return this.commandBus.execute(new DeleteTaskCommand(id));
  }

  /**
   * Retrieves statistics about tasks.
   * @returns An object with task counts by status and priority.
   */
  getStats(): Promise<TaskStatsDto> {
    return this.queryBus.execute(new GetTaskStatsQuery());
  }

  /**
   * Performs batch operations on a set of tasks, ensuring user ownership.
   * @param operations - An object containing the task IDs and the action to perform.
   * @returns A summary of the successful and failed operations.
   */
  batchProcess(operations: BatchTaskDto): Promise<{ success: string[]; failed: string[] }> {
    return this.commandBus.execute(new BatchProcessTasksCommand(operations));
  }
}
