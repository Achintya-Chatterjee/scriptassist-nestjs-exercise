import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TaskStatus } from './enums/task-status.enum';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TaskPriority } from './enums/task-priority.enum';
import { PaginatedResponse } from 'src/types/pagination.interface';
import { TaskResponseDto } from './dto/task-response.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectQueue('task-processing')
    private taskQueue: Queue,
  ) {}

  /**
   * Creates a new task and adds a status update job to the queue.
   * This operation is wrapped in a transaction to ensure atomicity.
   * @param createTaskDto - The data for creating the new task.
   * @returns The created task entity.
   */
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksRepository.manager.transaction(async transactionalEntityManager => {
      const task = transactionalEntityManager.create(Task, createTaskDto);
      const savedTask = await transactionalEntityManager.save(task);

      await this.taskQueue.add('task-status-update', {
        taskId: savedTask.id,
        status: savedTask.status,
      });

      return savedTask;
    });
  }

  /**
   * Retrieves a paginated and filtered list of tasks.
   * @param filterDto - DTO containing filter and pagination parameters.
   * @returns A paginated list of tasks.
   */
  async findAll(filterDto: TaskFilterDto): Promise<PaginatedResponse<TaskResponseDto>> {
    const { status, priority, page = 1, limit = 10 } = filterDto;
    const query = this.tasksRepository.createQueryBuilder('task');

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    const [tasks, total] = await query
      .leftJoinAndSelect('task.user', 'user')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const taskResponseDtos = tasks.map(task => new TaskResponseDto(task));

    return {
      data: taskResponseDtos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Finds a single task by its ID.
   * Throws a NotFoundException if the task doesn't exist.
   * @param id - The UUID of the task.
   * @returns The found task entity.
   */
  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  /**
   * Updates a task's properties.
   * Throws a NotFoundException if the task doesn't exist.
   * @param id - The UUID of the task to update.
   * @param updateTaskDto - The new data for the task.
   * @returns The updated task entity.
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    const originalStatus = task.status;

    Object.assign(task, updateTaskDto);

    const updatedTask = await this.tasksRepository.save(task);

    if (originalStatus !== updatedTask.status) {
      await this.taskQueue.add('task-status-update', {
        taskId: updatedTask.id,
        status: updatedTask.status,
      });
    }

    return updatedTask;
  }

  /**
   * Deletes a task by its ID.
   * Throws a NotFoundException if the task doesn't exist.
   * @param id - The UUID of the task to delete.
   */
  async remove(id: string): Promise<void> {
    const result = await this.tasksRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
  }

  /**
   * Retrieves statistics about tasks.
   * @returns An object with task counts by status and priority.
   */
  async getStats(): Promise<{ byStatus: any; byPriority: any; total: number }> {
    const stats = await this.tasksRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('task.priority', 'priority')
      .addSelect('COUNT(task.id)', 'count')
      .groupBy('task.status, task.priority')
      .getRawMany();

    return stats.reduce(
      (acc, { status, priority, count }) => {
        if (status) {
          acc.byStatus[status] = (acc.byStatus[status] || 0) + parseInt(count, 10);
        }
        if (priority) {
          acc.byPriority[priority] = (acc.byPriority[priority] || 0) + parseInt(count, 10);
        }
        acc.total += parseInt(count, 10);
        return acc;
      },
      { byStatus: {}, byPriority: {}, total: 0 },
    );
  }

  /**
   * Performs batch operations (e.g., complete, delete) on a set of tasks.
   * @param operations - An object containing the task IDs and the action to perform.
   * @returns A summary of the successful and failed operations.
   */
  async batchProcess(operations: {
    tasks: string[];
    action: string;
  }): Promise<{ success: string[]; failed: string[] }> {
    const { tasks: taskIds, action } = operations;

    if (!taskIds || taskIds.length === 0) {
      throw new BadRequestException('Task IDs must be provided.');
    }

    switch (action) {
      case 'complete': {
        const updateResult = await this.tasksRepository.update(
          { id: In(taskIds) },
          { status: TaskStatus.COMPLETED },
        );
        const affectedCount = updateResult.affected ?? 0;
        return {
          success: affectedCount > 0 ? taskIds : [],
          failed: affectedCount === 0 ? taskIds : [],
        };
      }
      case 'delete': {
        const deleteResult = await this.tasksRepository.delete({ id: In(taskIds) });
        const affectedCount = deleteResult.affected ?? 0;
        return {
          success: affectedCount > 0 ? taskIds : [],
          failed: affectedCount === 0 ? taskIds : [],
        };
      }
      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    // Inefficient implementation: doesn't use proper repository patterns
    const query = 'SELECT * FROM tasks WHERE status = $1';
    return this.tasksRepository.query(query, [status]);
  }

  async updateStatus(id: string, status: string): Promise<Task> {
    // This method will be called by the task processor
    const task = await this.findOne(id);
    task.status = status as any;
    return this.tasksRepository.save(task);
  }
}
