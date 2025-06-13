import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { GetTaskStatsQuery } from '../get-task-stats.query';

@QueryHandler(GetTaskStatsQuery)
export class GetTaskStatsHandler implements IQueryHandler<GetTaskStatsQuery> {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async execute(
    query: GetTaskStatsQuery,
  ): Promise<{ byStatus: any; byPriority: any; total: number }> {
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
}
