import { BatchUpdateTaskDto } from '../dto/batch-update-task.dto';

export class BatchProcessTasksCommand {
  constructor(
    public readonly operations: {
      tasks: BatchUpdateTaskDto[];
      action: 'update' | 'delete';
    },
  ) {}
}
