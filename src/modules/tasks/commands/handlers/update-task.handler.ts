import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { UpdateTaskCommand } from '../update-task.command';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(UpdateTaskCommand)
export class UpdateTaskHandler implements ICommandHandler<UpdateTaskCommand> {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue,
  ) {}

  async execute(command: UpdateTaskCommand): Promise<Task> {
    const { id, updateTaskDto } = command;

    return this.tasksRepository.manager.transaction(async transactionalEntityManager => {
      const task = await transactionalEntityManager.findOne(Task, { where: { id } });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      const originalStatus = task.status;

      Object.assign(task, updateTaskDto);

      const updatedTask = await transactionalEntityManager.save(task);

      if (originalStatus !== updatedTask.status) {
        await this.taskQueue.add('task-status-update', {
          taskId: updatedTask.id,
          status: updatedTask.status,
        });
      }

      return updatedTask;
    });
  }
}
