import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { GetTaskStatsQuery } from '../get-task-stats.query';
import { TaskStatsDto } from '../../dto/task-stats.dto';
import { TaskStatus } from '../../enums/task-status.enum';
import { TaskPriority } from '../../enums/task-priority.enum';

@QueryHandler(GetTaskStatsQuery)
export class GetTaskStatsHandler implements IQueryHandler<GetTaskStatsQuery> {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async execute(query: GetTaskStatsQuery): Promise<TaskStatsDto> {
    const stats: { status: TaskStatus; priority: TaskPriority; count: string }[] =
      await this.tasksRepository
        .createQueryBuilder('task')
        .select('task.status', 'status')
        .addSelect('task.priority', 'priority')
        .addSelect('COUNT(task.id)', 'count')
        .groupBy('task.status, task.priority')
        .getRawMany();

    return stats.reduce<TaskStatsDto>(
      (acc, { status, priority, count }) => {
        const numCount = parseInt(count, 10);
        if (status) {
          acc.byStatus[status] = (acc.byStatus[status] || 0) + numCount;
        }
        if (priority) {
          acc.byPriority[priority] = (acc.byPriority[priority] || 0) + numCount;
        }
        acc.total += numCount;
        return acc;
      },
      { byStatus: {}, byPriority: {}, total: 0 },
    );
  }
}
