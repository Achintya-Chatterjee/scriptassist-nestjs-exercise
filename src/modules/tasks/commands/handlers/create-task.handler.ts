import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { CreateTaskCommand } from '../create-task.command';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { User } from '../../../users/entities/user.entity';

@CommandHandler(CreateTaskCommand)
export class CreateTaskHandler implements ICommandHandler<CreateTaskCommand> {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue,
    private readonly cls: ClsService,
  ) {}

  async execute(command: CreateTaskCommand): Promise<Task> {
    const { createTaskDto } = command;
    const user = this.cls.get('user') as User;

    return this.tasksRepository.manager.transaction(async transactionalEntityManager => {
      const task = transactionalEntityManager.create(Task, {
        ...createTaskDto,
        userId: user.id,
      });
      const savedTask: Task = await transactionalEntityManager.save(task);

      await this.taskQueue.add('task-status-update', {
        taskId: savedTask.id,
        status: savedTask.status,
      });

      return savedTask;
    });
  }
}
