import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RegisterDto } from '../../src/modules/auth/dto/register.dto';
import { User } from '../../src/modules/users/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { CreateTaskDto } from 'src/modules/tasks/dto/create-task.dto';
import { TaskStatus } from 'src/modules/tasks/enums/task-status.enum';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let userRepository: Repository<User>;
  let taskRepository: Repository<Task>;
  let createdUser: User;

  const registerDto: RegisterDto = {
    name: 'Test User E2E',
    email: 'test.e2e@user.com',
    password: 'password123',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    taskRepository = moduleFixture.get<Repository<Task>>(getRepositoryToken(Task));

    // Clean up user before test to ensure a clean state
    const user = await userRepository.findOne({ where: { email: registerDto.email } });
    if (user) {
      await taskRepository.delete({ userId: user.id });
      await userRepository.delete({ email: registerDto.email });
    }

    // Create user and get tokens
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    createdUser = registerResponse.body.user;
    jwtToken = registerResponse.body.tokens.accessToken;
  });

  afterEach(async () => {
    // Clean up tasks and user after each test
    if (createdUser) {
      await taskRepository.delete({ userId: createdUser.id });
      await userRepository.delete({ id: createdUser.id });
    }
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
    expect(jwtToken).toBeDefined();
    expect(createdUser).toBeDefined();
  });

  describe('POST /tasks', () => {
    it('should create a new task for the authenticated user', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'My E2E Task',
        description: 'A description for my e2e task',
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(createTaskDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.title).toBe(createTaskDto.title);
      expect(response.body.description).toBe(createTaskDto.description);
      expect(response.body.userId).toBe(createdUser.id);

      // Verify the task exists in the database
      const taskInDb = await taskRepository.findOne({ where: { id: response.body.id } });
      expect(taskInDb).not.toBeNull();
      expect(taskInDb!.title).toBe(createTaskDto.title);
    });

    it('should return 401 Unauthorized if no token is provided', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'My E2E Task',
        description: 'A description for my e2e task',
      };
      await request(app.getHttpServer()).post('/tasks').send(createTaskDto).expect(401);
    });

    it('should return 400 Bad Request if title is missing', async () => {
      const createTaskDto = {
        description: 'A description without a title',
      };

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(createTaskDto)
        .expect(400);
    });
  });

  describe('GET /tasks', () => {
    it('should return a list of tasks for the authenticated user', async () => {
      // Arrange: Create a task for the current user
      await taskRepository.save({
        title: 'Task to be fetched',
        description: 'A task to test GET /tasks',
        userId: createdUser.id,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe('Task to be fetched');
      expect(response.body.data[0].userId).toBe(createdUser.id);
    });

    it('should not return tasks owned by other users', async () => {
      // Arrange: Create another user and a task for them
      const otherUser = await userRepository.save({
        name: 'Other User',
        email: 'other.user@test.com',
        password: 'password123',
      });
      const otherTask = await taskRepository.save({
        title: 'Other User Task',
        description: 'This should not be visible',
        userId: otherUser.id,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);

      // Cleanup
      await taskRepository.delete({ id: otherTask.id });
      await userRepository.delete({ id: otherUser.id });
    });

    it('should handle pagination correctly', async () => {
      // Arrange: Create 3 tasks for the current user
      await taskRepository.save([
        { title: 'Task 1', userId: createdUser.id },
        { title: 'Task 2', userId: createdUser.id },
        { title: 'Task 3', userId: createdUser.id },
      ]);

      // Act: Get first page
      const page1Response = await request(app.getHttpServer())
        .get('/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert: First page
      expect(page1Response.body.data.length).toBe(2);
      expect(page1Response.body.meta).toEqual({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });

      // Act: Get second page
      const page2Response = await request(app.getHttpServer())
        .get('/tasks?page=2&limit=2')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert: Second page
      expect(page2Response.body.data.length).toBe(1);
      expect(page2Response.body.meta).toEqual({
        total: 3,
        page: 2,
        limit: 2,
        totalPages: 2,
      });
    });

    it('should filter tasks by status', async () => {
      // Arrange: Create tasks with different statuses
      await taskRepository.save([
        { title: 'Pending Task', userId: createdUser.id, status: TaskStatus.PENDING },
        { title: 'Completed Task', userId: createdUser.id, status: TaskStatus.COMPLETED },
      ]);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/tasks?status=${TaskStatus.COMPLETED}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe('Completed Task');
      expect(response.body.data[0].status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return a task if the user owns it', async () => {
      // Arrange
      const task = await taskRepository.save({
        title: 'An owned task',
        userId: createdUser.id,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body.id).toBe(task.id);
      expect(response.body.title).toBe(task.title);
    });

    it('should return 404 if task is not found', async () => {
      const nonExistentId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // some random uuid
      await request(app.getHttpServer())
        .get(`/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });

    it('should return 403 if the user does not own the task', async () => {
      // Arrange: Create another user and a task for them
      const otherUser = await userRepository.save({
        name: 'Other User 2',
        email: 'other.user2@test.com',
        password: 'password123',
      });
      const otherTask = await taskRepository.save({
        title: 'Other User Task 2',
        userId: otherUser.id,
      });

      // Act & Assert
      await request(app.getHttpServer())
        .get(`/tasks/${otherTask.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(403);

      // Cleanup
      await taskRepository.delete({ id: otherTask.id });
      await userRepository.delete({ id: otherUser.id });
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update a task if the user owns it', async () => {
      // Arrange
      const task = await taskRepository.save({
        title: 'Task to update',
        userId: createdUser.id,
      });
      const updateDto = { title: 'Updated Title', status: TaskStatus.IN_PROGRESS };

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body.title).toBe(updateDto.title);
      expect(response.body.status).toBe(updateDto.status);

      // Verify in DB
      const updatedTask = await taskRepository.findOne({ where: { id: task.id } });
      expect(updatedTask).not.toBeNull();
      expect(updatedTask!.title).toBe(updateDto.title);
      expect(updatedTask!.status).toBe(updateDto.status);
    });

    it('should return 404 if task to update is not found', async () => {
      const nonExistentId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const updateDto = { title: 'Updated Title' };

      await request(app.getHttpServer())
        .patch(`/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 403 if user does not own the task to update', async () => {
      // Arrange
      const otherUser = await userRepository.save({
        name: 'Other User 3',
        email: 'other.user3@test.com',
        password: 'password123',
      });
      const otherTask = await taskRepository.save({
        title: 'Other User Task 3',
        userId: otherUser.id,
      });
      const updateDto = { title: 'Updated Title' };

      // Act & Assert
      await request(app.getHttpServer())
        .patch(`/tasks/${otherTask.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateDto)
        .expect(403);

      // Cleanup
      await taskRepository.delete({ id: otherTask.id });
      await userRepository.delete({ id: otherUser.id });
    });

    it('should return 400 if an invalid status is provided', async () => {
      // Arrange
      const task = await taskRepository.save({
        title: 'Task for invalid update',
        userId: createdUser.id,
      });
      const updateDto = { status: 'INVALID_STATUS' };

      // Act & Assert
      await request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateDto)
        .expect(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task if the user owns it', async () => {
      // Arrange
      const task = await taskRepository.save({
        title: 'Task to be deleted',
        userId: createdUser.id,
      });

      // Act
      await request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      const deletedTask = await taskRepository.findOne({ where: { id: task.id } });
      expect(deletedTask).toBeNull();
    });

    it('should return 404 if task to delete is not found', async () => {
      const nonExistentId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      await request(app.getHttpServer())
        .delete(`/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });

    it('should return 403 if user does not own the task to delete', async () => {
      // Arrange
      const otherUser = await userRepository.save({
        name: 'Other User 4',
        email: 'other.user4@test.com',
        password: 'password123',
      });
      const otherTask = await taskRepository.save({
        title: 'Other User Task 4',
        userId: otherUser.id,
      });

      // Act & Assert
      await request(app.getHttpServer())
        .delete(`/tasks/${otherTask.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(403);

      // Cleanup
      await taskRepository.delete({ id: otherTask.id });
      await userRepository.delete({ id: otherUser.id });
    });
  });
});
