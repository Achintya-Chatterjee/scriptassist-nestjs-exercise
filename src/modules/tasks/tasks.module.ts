import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateTaskHandler } from './commands/handlers/create-task.handler';
import { UpdateTaskHandler } from './commands/handlers/update-task.handler';
import { DeleteTaskHandler } from './commands/handlers/delete-task.handler';
import { BatchProcessTasksHandler } from './commands/handlers/batch-process-tasks.handler';
import { GetAllTasksHandler } from './queries/handlers/get-all-tasks.handler';
import { GetTaskByIdHandler } from './queries/handlers/get-task-by-id.handler';
import { GetTaskStatsHandler } from './queries/handlers/get-task-stats.handler';
import { TaskOwnershipGuard } from './guards/task-ownership.guard';

export const CommandHandlers = [
  CreateTaskHandler,
  UpdateTaskHandler,
  DeleteTaskHandler,
  BatchProcessTasksHandler,
];
export const QueryHandlers = [GetAllTasksHandler, GetTaskByIdHandler, GetTaskStatsHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({
      name: 'task-processing',
    }),
    CqrsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskOwnershipGuard, ...CommandHandlers, ...QueryHandlers],
  exports: [TasksService],
})
export class TasksModule {}
