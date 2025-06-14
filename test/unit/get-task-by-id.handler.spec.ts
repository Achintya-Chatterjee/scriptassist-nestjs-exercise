import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { GetTaskByIdHandler } from '../../src/modules/tasks/queries/handlers/get-task-by-id.handler';
import { GetTaskByIdQuery } from '../../src/modules/tasks/queries/get-task-by-id.query';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { mockTask } from '../mocks/data';

const mockTasksRepository = {
  findOne: mock(async (options: any): Promise<Task | null> => null),
};

describe('GetTaskByIdHandler', () => {
  let handler: GetTaskByIdHandler;

  beforeEach(() => {
    mockTasksRepository.findOne.mockClear();

    handler = new GetTaskByIdHandler(mockTasksRepository as unknown as Repository<Task>);
  });

  it('should find and return a task if it exists', async () => {
    mockTasksRepository.findOne.mockResolvedValue(mockTask);

    const query = new GetTaskByIdQuery(mockTask.id);
    const result = await handler.execute(query);

    expect(result).toEqual(mockTask);
    expect(mockTasksRepository.findOne).toHaveBeenCalledWith({
      where: { id: mockTask.id },
      relations: ['user'],
    });
  });

  it('should throw NotFoundException if the task does not exist', async () => {
    const taskId = 'non-existent-uuid';
    mockTasksRepository.findOne.mockResolvedValue(null);

    const query = new GetTaskByIdQuery(taskId);

    const promise = handler.execute(query);
    expect(promise).rejects.toThrow(NotFoundException);
    expect(promise).rejects.toThrow(`Task with ID ${taskId} not found`);
  });
});
