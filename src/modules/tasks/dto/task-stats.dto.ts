import { ApiProperty } from '@nestjs/swagger';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';

export class TaskStatsDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus: Partial<Record<TaskStatus, number>>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byPriority: Partial<Record<TaskPriority, number>>;

  @ApiProperty()
  total: number;
}
