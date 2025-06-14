import { User } from '../../src/modules/users/entities/user.entity';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { TaskStatus } from '../../src/modules/tasks/enums/task-status.enum';
import { TaskPriority } from '../../src/modules/tasks/enums/task-priority.enum';

export const mockUser: User = {
  id: 'user-uuid-1',
  name: 'Test User',
  email: 'test@user.com',
  password: 'hashedPassword',
  role: 'user',
  tasks: [],
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockTask: Task = {
  id: 'task-uuid-1',
  title: 'Test Task',
  description: 'A test description',
  status: TaskStatus.PENDING,
  priority: TaskPriority.MEDIUM,
  dueDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: mockUser.id,
  user: mockUser,
};
