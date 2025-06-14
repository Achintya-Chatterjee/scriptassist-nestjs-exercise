import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
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

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal Server Error';

    const logMessage =
      exception instanceof Error ? exception.message : 'An unexpected error occurred.';

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Message: ${logMessage}`,
      typeof errorResponse === 'object' && errorResponse !== null
        ? JSON.stringify(errorResponse, null, 2)
        : exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
    );

    if (typeof errorResponse === 'object' && errorResponse !== null) {
      response.status(status).json({
        ...errorResponse,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: errorResponse,
      });
    }
  }
}
