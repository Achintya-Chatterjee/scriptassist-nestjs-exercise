import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TasksService } from '../tasks.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class TaskOwnershipGuard implements CanActivate {
  constructor(private readonly tasksService: TasksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    const taskId = request.params.id;

    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    if (!taskId) {
      // This guard should only be used on routes with a task ID param
      return true;
    }

    // Admins can access any task
    if (user.role === 'admin') {
      return true;
    }

    const task = await this.tasksService.findOne(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    if (task.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }

    return true;
  }
}
