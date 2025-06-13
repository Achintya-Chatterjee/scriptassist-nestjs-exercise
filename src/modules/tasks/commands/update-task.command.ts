import { UpdateTaskDto } from '../dto/update-task.dto';

export class UpdateTaskCommand {
  constructor(
    public readonly id: string,
    public readonly updateTaskDto: UpdateTaskDto,
  ) {}
}
