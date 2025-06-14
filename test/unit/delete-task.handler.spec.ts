import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Repository } from 'typeorm';
import { DeleteTaskHandler } from '../../src/modules/tasks/commands/handlers/delete-task.handler';
import { DeleteTaskCommand } from '../../src/modules/tasks/commands/delete-task.command';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { NotFoundException } from '@nestjs/common';
import { mockTask } from '../mocks/data';

// Mock the repository
const mockTasksRepository = {
  delete: mock(async (id: string) => ({ affected: 1, raw: {} })),
};

describe('DeleteTaskHandler', () => {
  let handler: DeleteTaskHandler;

  beforeEach(() => {
    mockTasksRepository.delete.mockClear();
    handler = new DeleteTaskHandler(mockTasksRepository as unknown as Repository<Task>);
  });

  it('should delete a task successfully', async () => {
    const command = new DeleteTaskCommand(mockTask.id);
    mockTasksRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

    await handler.execute(command);

    expect(mockTasksRepository.delete).toHaveBeenCalledWith(mockTask.id);
    expect(mockTasksRepository.delete).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundException if task does not exist', async () => {
    const taskId = 'non-existent-uuid';
    const command = new DeleteTaskCommand(taskId);
    mockTasksRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

    const promise = handler.execute(command);

    expect(promise).rejects.toThrow(NotFoundException);
    expect(promise).rejects.toThrow(`Task with ID ${taskId} not found`);
    expect(mockTasksRepository.delete).toHaveBeenCalledWith(taskId);
  });
});
