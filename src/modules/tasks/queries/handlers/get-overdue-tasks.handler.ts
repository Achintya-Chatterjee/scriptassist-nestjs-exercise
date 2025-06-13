import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { GetOverdueTasksQuery } from '../get-overdue-tasks.query';
import { TaskStatus } from '../../enums/task-status.enum';

@QueryHandler(GetOverdueTasksQuery)
export class GetOverdueTasksHandler implements IQueryHandler<GetOverdueTasksQuery> {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async execute(query: GetOverdueTasksQuery): Promise<Task[]> {
    const now = new Date();
    return this.tasksRepository.find({
      where: {
        dueDate: LessThan(now),
        status: TaskStatus.PENDING,
      },
    });
  }
}
