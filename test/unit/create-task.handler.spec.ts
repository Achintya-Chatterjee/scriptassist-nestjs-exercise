import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Repository } from 'typeorm';
import { CreateTaskHandler } from '../../src/modules/tasks/commands/handlers/create-task.handler';
import { CreateTaskCommand } from '../../src/modules/tasks/commands/create-task.command';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { mockUser } from '../mocks/data';
import { Queue } from 'bullmq';
import { ClsService } from 'nestjs-cls';

// Mocks
const mockTasksRepository = {
  manager: {
    transaction: mock(async (cb: any) => {
      // Mock the transactional entity manager
      const transactionalEntityManager = {
        create: (entity: any, dto: any) => ({ ...dto, id: 'new-task-uuid' }),
        save: async (task: any) => task,
      };
      return cb(transactionalEntityManager);
    }),
  },
};

const mockTaskQueue = {
  add: mock(async (name: string, data: any) => null),
};

const mockClsService = {
  get: mock((key: string) => (key === 'user' ? mockUser : null)),
};

describe('CreateTaskHandler', () => {
  let handler: CreateTaskHandler;

  beforeEach(() => {
    // Reset mocks before each test
    mockTasksRepository.manager.transaction.mockClear();
    mockTaskQueue.add.mockClear();
    mockClsService.get.mockClear();

    handler = new CreateTaskHandler(
      mockTasksRepository as any,
      mockTaskQueue as unknown as Queue,
      mockClsService as unknown as ClsService,
    );
  });

  it('should create a task, save it, and add a job to the queue', async () => {
    const createTaskDto = {
      title: 'New Test Task',
      description: 'A description for the new task',
    };

    const command = new CreateTaskCommand(createTaskDto);
    const result = await handler.execute(command);

    // Verify the user was retrieved from CLS
    expect(mockClsService.get).toHaveBeenCalledWith('user');

    // Verify the transaction was initiated
    expect(mockTasksRepository.manager.transaction).toHaveBeenCalledTimes(1);

    // Verify a job was added to the queue
    expect(mockTaskQueue.add).toHaveBeenCalledWith('task-status-update', {
      taskId: 'new-task-uuid',
      status: undefined, // Status is not defined in the DTO, so it will be the default
    });

    // Verify the result
    expect(result.id).toBe('new-task-uuid');
    expect(result.title).toBe(createTaskDto.title);
    expect(result.userId).toBe(mockUser.id);
  });
});
