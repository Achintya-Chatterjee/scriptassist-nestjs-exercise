import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof QueryFailedError) {
      // Handle unique constraint violation
      if ((exception as any).code === '23505') {
        status = HttpStatus.CONFLICT;
        message = {
          statusCode: status,
          message: 'A record with the same key already exists.',
          error: 'Conflict',
        };
      }
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Message: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    response.status(status).json(
      typeof message === 'object'
        ? { ...message, timestamp: new Date().toISOString(), path: request.url }
        : {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
          },
    );
  }
}
