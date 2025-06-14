import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, EntityManager } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { BatchProcessTasksCommand } from '../batch-process-tasks.command';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { User } from '../../../users/entities/user.entity';
import { UpdateTaskDto } from '../../dto/update-task.dto';

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
    const { tasks: taskUpdates, action } = operations;
    const user = this.cls.get('user') as User;

    if (!taskUpdates || taskUpdates.length === 0) {
      throw new BadRequestException('Task update operations must be provided.');
    }

    const taskIds = taskUpdates.map(t => t.id);

    const tasks = await this.tasksRepository.find({
      where: { id: In(taskIds) },
    });

    if (tasks.length !== taskIds.length) {
      throw new NotFoundException('One or more tasks not found.');
    }

    if (user.role !== 'admin') {
      for (const task of tasks) {
        if (task.userId !== user.id) {
          throw new ForbiddenException(
            'You do not have permission to modify one or more of these tasks.',
          );
        }
      }
    }

    const success: string[] = [];
    const failed: string[] = [];

    await this.tasksRepository.manager.transaction(async transactionalEntityManager => {
      if (action === 'update') {
        for (const update of taskUpdates) {
          try {
            const { id, ...updateData } = update;
            await transactionalEntityManager.update(Task, id, updateData);
            success.push(id);
          } catch (error) {
            failed.push(update.id);
          }
        }
      } else if (action === 'delete') {
        try {
          await transactionalEntityManager.delete(Task, taskIds);
          success.push(...taskIds);
        } catch (error) {
          failed.push(...taskIds);
        }
      } else {
        throw new BadRequestException(`Unknown action: ${action}`);
      }
    });

    return { success, failed };
  }
}
