import { IsUUID } from 'class-validator';
import { UpdateTaskDto } from './update-task.dto';

export class BatchUpdateTaskDto extends UpdateTaskDto {
  @IsUUID()
  id: string;
}
