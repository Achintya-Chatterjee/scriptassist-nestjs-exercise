import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { BatchProcessTasksCommand } from '../batch-process-tasks.command';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { User } from '../../../users/entities/user.entity';
import { TaskStatus } from '../../enums/task-status.enum';

@CommandHandler(BatchProcessTasksCommand)
export class BatchProcessTasksHandler implements ICommandHandler<BatchProcessTasksCommand> {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly cls: ClsService,
  ) {}

  async execute(
    command: BatchProcessTasksCommand,
  ): Promise<{ success: string[]; failed: string[] }> {
    const { operations } = command;
    const { tasks: taskIds, action } = operations;
    const user = this.cls.get('user') as User;

    if (!taskIds || taskIds.length === 0) {
      throw new BadRequestException('Task IDs must be provided.');
    }

    if (user.role !== 'admin') {
      const tasks = await this.tasksRepository.find({
        where: { id: In(taskIds) },
      });

      if (tasks.length !== taskIds.length) {
        throw new NotFoundException('One or more tasks not found.');
      }

      for (const task of tasks) {
        if (task.userId !== user.id) {
          throw new ForbiddenException(
            'You do not have permission to modify one or more of these tasks.',
          );
        }
      }
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
}
