import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly cls?: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const { method, url, ip } = req;
    const now = Date.now();

    this.logger.log(`[${method}] ${url} - Request received`);

    return next.handle().pipe(
      tap({
        next: () => {
          const delay = Date.now() - now;
          const user = this.cls?.get('user');
          const userId = user ? user.id : 'anonymous';

          const logData = {
            method,
            url,
            statusCode: res.statusCode,
            ip,
            userId,
            delay: `${delay}ms`,
          };
          this.logger.log(JSON.stringify(logData));
          this.logger.log(`[${method}] ${url} - Request completed in ${delay}ms`);
        },
        error: err => {
          const delay = Date.now() - now;
          const user = this.cls?.get('user');
          const userId = user ? user.id : 'anonymous';

          const logData = {
            method,
            url,
            statusCode: err.status || 500,
            ip,
            userId,
            delay: `${delay}ms`,
            error: err.message,
          };
          this.logger.error(JSON.stringify(logData));
          this.logger.error(`[${method}] ${url} - Request completed with error in ${delay}ms`);
        },
      }),
    );
  }
}
