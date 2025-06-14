import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Repository } from 'typeorm';
import { UpdateTaskHandler } from '../../src/modules/tasks/commands/handlers/update-task.handler';
import { UpdateTaskCommand } from '../../src/modules/tasks/commands/update-task.command';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { mockTask } from '../mocks/data';
import { Queue } from 'bullmq';
import { NotFoundException } from '@nestjs/common';
import { TaskStatus } from '../../src/modules/tasks/enums/task-status.enum';

// Mocks
const mockTasksRepository = {
  manager: {
    transaction: mock(async (cb: any) => {
      // This will be customized inside each test
    }),
  },
};

const mockTaskQueue = {
  add: mock(async (name: string, data: any) => null),
};

describe('UpdateTaskHandler', () => {
  let handler: UpdateTaskHandler;

  beforeEach(() => {
    mockTasksRepository.manager.transaction.mockClear();
    mockTaskQueue.add.mockClear();
    handler = new UpdateTaskHandler(mockTasksRepository as any, mockTaskQueue as unknown as Queue);
  });

  it('should find, update, and save a task', async () => {
    const updateDto = { title: 'Updated Title' };
    const command = new UpdateTaskCommand(mockTask.id, updateDto);

    // Mock the transaction for this specific test
    mockTasksRepository.manager.transaction.mockImplementation(async cb => {
      const transactionalEntityManager = {
        findOne: async () => ({ ...mockTask }),
        save: async (task: Task) => ({ ...task, ...updateDto }),
      };
      return cb(transactionalEntityManager);
    });

    const result = await handler.execute(command);

    expect(result.title).toBe(updateDto.title);
    expect(result.description).toBe(mockTask.description); // Description should not change
    expect(mockTaskQueue.add).not.toHaveBeenCalled(); // Status didn't change
  });

  it('should add a job to the queue if the status changes', async () => {
    const updateDto = { status: TaskStatus.COMPLETED };
    const command = new UpdateTaskCommand(mockTask.id, updateDto);

    mockTasksRepository.manager.transaction.mockImplementation(async cb => {
      const transactionalEntityManager = {
        findOne: async () => ({ ...mockTask }),
        save: async (task: Task) => ({ ...task, ...updateDto }),
      };
      return cb(transactionalEntityManager);
    });

    const result = await handler.execute(command);

    expect(result.status).toBe(TaskStatus.COMPLETED);
    expect(mockTaskQueue.add).toHaveBeenCalledTimes(1);
    expect(mockTaskQueue.add).toHaveBeenCalledWith('task-status-update', {
      taskId: mockTask.id,
      status: TaskStatus.COMPLETED,
    });
  });

  it('should throw NotFoundException if task is not found', async () => {
    const taskId = 'non-existent-uuid';
    const command = new UpdateTaskCommand(taskId, { title: 'New Title' });

    mockTasksRepository.manager.transaction.mockImplementation(async cb => {
      const transactionalEntityManager = {
        findOne: async () => null, // Simulate task not found
        save: async (task: Task) => task,
      };
      return cb(transactionalEntityManager);
    });

    const promise = handler.execute(command);

    expect(promise).rejects.toThrow(NotFoundException);
    expect(promise).rejects.toThrow(`Task with ID ${taskId} not found`);
  });
});
