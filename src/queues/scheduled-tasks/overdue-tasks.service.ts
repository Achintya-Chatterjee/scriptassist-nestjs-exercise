import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueryBus } from '@nestjs/cqrs';
import { GetOverdueTasksQuery } from 'src/modules/tasks/queries/get-overdue-tasks.query';
import { Task } from 'src/modules/tasks/entities/task.entity';

@Injectable()
export class OverdueTasksService {
  private readonly logger = new Logger(OverdueTasksService.name);

  constructor(
    @InjectQueue('task-processing')
    private taskQueue: Queue,
    private readonly queryBus: QueryBus,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks() {
    this.logger.debug('Checking for overdue tasks...');

    const overdueTasks: Task[] = await this.queryBus.execute(new GetOverdueTasksQuery());

    this.logger.log(`Found ${overdueTasks.length} overdue tasks`);

    for (const task of overdueTasks) {
      await this.taskQueue.add('overdue-tasks-notification', { taskId: task.id });
    }

    this.logger.debug('Overdue tasks check completed');
  }
}
