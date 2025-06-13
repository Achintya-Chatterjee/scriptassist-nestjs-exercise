import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateTaskCommand } from 'src/modules/tasks/commands/update-task.command';
import { UpdateTaskDto } from 'src/modules/tasks/dto/update-task.dto';

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

  // Inefficient implementation:
  // - No proper job batching
  // - No error handling strategy
  // - No retries for failed jobs
  // - No concurrency control
  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'task-status-update':
          return await this.handleStatusUpdate(job);
        case 'overdue-tasks-notification':
          return await this.handleOverdueTasks(job);
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          return { success: false, error: 'Unknown job type' };
      }
    } catch (error) {
      // Basic error logging without proper handling or retries
      this.logger.error(
        `Error processing job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Let BullMQ handle the retry based on the default strategy
      throw error;
    }
  }

  private async handleStatusUpdate(job: Job) {
    const { taskId, status } = job.data;

    if (!taskId || !status) {
      this.logger.warn(`Invalid job data for task-status-update: ${JSON.stringify(job.data)}`);
      return { success: false, error: 'Missing required data' };
    }

    // Inefficient: No validation of status values
    // No transaction handling
    // No retry mechanism
    const task = await this.commandBus.execute(
      new UpdateTaskCommand(taskId, { status } as UpdateTaskDto),
    );

    return {
      success: true,
      taskId: task.id,
      newStatus: task.status,
    };
  }

  private async handleOverdueTasks(job: Job) {
    const { taskId } = job.data;
    if (!taskId) {
      this.logger.warn(
        `Invalid job data for overdue-tasks-notification: ${JSON.stringify(job.data)}`,
      );
      return { success: false, error: 'Missing taskId' };
    }

    this.logger.warn(`Task with ID ${taskId} is overdue. Sending notification...`);
    // In a production application, this would trigger an email, push notification, etc.
    // For this exercise, logging is sufficient.
    return { success: true, message: `Notification sent for overdue task ${taskId}` };
  }
}
