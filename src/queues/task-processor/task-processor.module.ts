import { Module } from '@nestjs/common';
import { TaskProcessorService } from './task-processor.service';
import { BullModule } from '@nestjs/bullmq';
import { TasksModule } from 'src/modules/tasks/tasks.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'task-processing',
    }),
    TasksModule,
  ],
  providers: [TaskProcessorService],
})
export class TaskProcessorModule {}
