import { TaskFilterDto } from '../dto/task-filter.dto';

export class GetAllTasksQuery {
  constructor(public readonly filterDto: TaskFilterDto) {}
}
