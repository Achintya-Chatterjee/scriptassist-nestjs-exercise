import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { GetAllTasksQuery } from '../get-all-tasks.query';
import { PaginatedResponse } from '../../../../types/pagination.interface';
import { TaskResponseDto } from '../../dto/task-response.dto';
import { ClsService } from 'nestjs-cls';
import { User } from '../../../users/entities/user.entity';

@QueryHandler(GetAllTasksQuery)
export class GetAllTasksHandler implements IQueryHandler<GetAllTasksQuery> {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly cls: ClsService,
  ) {}

  async execute(query: GetAllTasksQuery): Promise<PaginatedResponse<TaskResponseDto>> {
    const { filterDto } = query;
    const { status, priority, page = 1, limit = 10 } = filterDto;
    const user = this.cls.get('user') as User;
    const qb = this.tasksRepository.createQueryBuilder('task');

    if (user.role !== 'admin') {
      qb.andWhere('task.userId = :userId', { userId: user.id });
    }

    if (status) {
      qb.andWhere('task.status = :status', { status });
    }

    if (priority) {
      qb.andWhere('task.priority = :priority', { priority });
    }

    const [tasks, total] = await qb
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
}
