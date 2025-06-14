import { IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BatchUpdateTaskDto } from './batch-update-task.dto';

export class BatchTaskDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateTaskDto)
  tasks: BatchUpdateTaskDto[];

  @IsIn(['update', 'delete'])
  action: 'update' | 'delete';
}
