import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

export class UpdateTaskDto {
  @ApiProperty({ example: 'Complete project documentation', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'Add details about API endpoints and data models',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
    required: false,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
    required: false,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({
    example: '2025-12-31T23:59:59.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
