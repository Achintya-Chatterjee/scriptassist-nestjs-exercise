import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Repository } from 'typeorm';
import { GetAllTasksHandler } from '../../src/modules/tasks/queries/handlers/get-all-tasks.handler';
import { GetAllTasksQuery } from '../../src/modules/tasks/queries/get-all-tasks.query';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { mockUser, mockTask } from '../mocks/data';
import { ClsService } from 'nestjs-cls';
import { User } from '../../src/modules/users/entities/user.entity';
import { TaskStatus } from '../../src/modules/tasks/enums/task-status.enum';

const mockQueryBuilder = {
  andWhere: mock().mockReturnThis(),
  leftJoinAndSelect: mock().mockReturnThis(),
  skip: mock().mockReturnThis(),
  take: mock().mockReturnThis(),
  getManyAndCount: mock().mockResolvedValue([[], 0]),
};

const mockTasksRepository = {
  createQueryBuilder: mock().mockReturnValue(mockQueryBuilder),
};

const mockClsService = {
  get: mock((key: string) => (key === 'user' ? mockUser : null)),
};

describe('GetAllTasksHandler', () => {
  let handler: GetAllTasksHandler;

  beforeEach(() => {
    mockTasksRepository.createQueryBuilder.mockClear();
    mockClsService.get.mockClear();
    mockQueryBuilder.andWhere.mockClear();
    mockQueryBuilder.leftJoinAndSelect.mockClear();
    mockQueryBuilder.skip.mockClear();
    mockQueryBuilder.take.mockClear();
    mockQueryBuilder.getManyAndCount.mockClear();

    handler = new GetAllTasksHandler(
      mockTasksRepository as unknown as Repository<Task>,
      mockClsService as unknown as ClsService,
    );
  });

  it('should get tasks for a regular user with correct filters', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[{ ...mockTask, user: mockUser }], 1]);
    const filterDto = { page: 1, limit: 10, status: TaskStatus.PENDING };
    const query = new GetAllTasksQuery(filterDto);

    await handler.execute(query);

    expect(mockClsService.get).toHaveBeenCalledWith('user');

    expect(mockTasksRepository.createQueryBuilder).toHaveBeenCalledWith('task');

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('task.userId = :userId', {
      userId: mockUser.id,
    });

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('task.status = :status', {
      status: TaskStatus.PENDING,
    });

    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
  });

  it('should NOT filter by user for an admin', async () => {
    const adminUser: User = { ...mockUser, role: 'admin' };
    mockClsService.get.mockImplementation(key => (key === 'user' ? adminUser : null));
    const query = new GetAllTasksQuery({});

    await handler.execute(query);

    expect(mockClsService.get).toHaveBeenCalledWith('user');

    expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
      'task.userId = :userId',
      expect.anything(),
    );
  });

  it('should return a correctly structured paginated response', async () => {
    const tasks = [{ ...mockTask, user: mockUser }];
    mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([tasks, 1]);
    const query = new GetAllTasksQuery({ page: 1, limit: 5 });

    const result = await handler.execute(query);

    expect(result.data.length).toBe(1);
    expect(result.data[0].title).toBe(mockTask.title);
    expect(result.data[0].userId).toBe(mockUser.id);
    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      limit: 5,
      totalPages: 1,
    });
  });
});
