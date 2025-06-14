import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateTaskCommand } from 'src/modules/tasks/commands/update-task.command';
import { TaskStatus } from 'src/modules/tasks/enums/task-status.enum';
import { UpdateTaskDto } from 'src/modules/tasks/dto/update-task.dto';

// #region Job Data Interfaces
interface TaskStatusUpdateData {
  taskId: string;
  status: TaskStatus;
}

interface OverdueTaskData {
  taskId: string;
}
// #endregion

// #region Job Result Type
type JobResult = {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
};
// #endregion

@Injectable()
@Processor('task-processing', {
  concurrency: 10, // Process 10 jobs concurrently
  limiter: {
    max: 100, // Max 100 jobs
    duration: 1000, // per second
  },
})
export class TaskProcessorService extends WorkerHost {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async process(job: Job): Promise<JobResult> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'task-status-update':
          return await this.handleStatusUpdate(job as Job<TaskStatusUpdateData>);
        case 'overdue-tasks-notification':
          return await this.handleOverdueTasks(job as Job<OverdueTaskData>);
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          return { success: false, error: 'Unknown job type' };
      }
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Let BullMQ handle the retry based on the default strategy
      throw error;
    }
  }

  private async handleStatusUpdate(job: Job<TaskStatusUpdateData>): Promise<JobResult> {
    const { taskId, status } = job.data;

    if (!taskId || !status) {
      this.logger.warn(`Invalid job data for task-status-update: ${JSON.stringify(job.data)}`);
      return { success: false, error: 'Missing required data' };
    }

    const updateDto: UpdateTaskDto = { status };
    const task = await this.commandBus.execute(new UpdateTaskCommand(taskId, updateDto));

    return {
      success: true,
      taskId: task.id,
      newStatus: task.status,
    };
  }

  private async handleOverdueTasks(job: Job<OverdueTaskData>): Promise<JobResult> {
    const { taskId } = job.data;
    if (!taskId) {
      this.logger.warn(
        `Invalid job data for overdue-tasks-notification: ${JSON.stringify(job.data)}`,
      );
      return { success: false, error: 'Missing taskId' };
    }

    this.logger.warn(`Task with ID ${taskId} is overdue. Sending notification...`);
    // In a production application, this would trigger an email, push notification, etc.
    return { success: true, message: `Notification sent for overdue task ${taskId}` };
  }
}
