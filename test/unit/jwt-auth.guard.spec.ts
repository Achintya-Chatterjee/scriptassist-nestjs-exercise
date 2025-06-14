import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { ClsService } from 'nestjs-cls';
import { ExecutionContext } from '@nestjs/common';

const mockClsService = {
  set: mock((key: string, value: any) => {}),
};

const mockExecutionContext = {} as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    mockClsService.set.mockClear();
    guard = new JwtAuthGuard(mockClsService as any);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should set user in CLS if user is found', () => {
    const mockUser = { id: '1', email: 'test@test.com', name: 'Test', role: 'user' };
    const result = guard.handleRequest(null, mockUser, null, mockExecutionContext);
    expect(mockClsService.set).toHaveBeenCalledTimes(1);
    expect(mockClsService.set).toHaveBeenCalledWith('user', mockUser);
    expect(result).toEqual(mockUser);
  });

  it('should throw an error and not set user in CLS if user is not found', () => {
    expect(() => guard.handleRequest(null, null, null, mockExecutionContext)).toThrow(
      'Unauthorized',
    );
    expect(mockClsService.set).not.toHaveBeenCalled();
  });

  it('should forward other errors to the base implementation', () => {
    const error = new Error('Test Error');
    expect(() => guard.handleRequest(error, null, null, mockExecutionContext)).toThrow(error);
  });
});
