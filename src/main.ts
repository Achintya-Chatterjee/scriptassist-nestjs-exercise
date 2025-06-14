import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ClsService } from 'nestjs-cls';

function generateValidationErrorMessage(errors: ValidationError[]): Record<string, any> {
  const errorMessages: Record<string, any> = {};
  for (const error of errors) {
    if (error.children && error.children.length > 0) {
      errorMessages[error.property] = generateValidationErrorMessage(error.children);
    } else if (error.constraints) {
      errorMessages[error.property] = Object.values(error.constraints);
    }
  }
  return errorMessages;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global serialization interceptor
  app.useGlobalInterceptors(
    new LoggingInterceptor(app.get(ClsService)),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = generateValidationErrorMessage(errors);
        return new BadRequestException({
          statusCode: 400,
          message: 'Input data validation failed',
          errors: formattedErrors,
        });
      },
    }),
  );

  // CORS
  app.enableCors();

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('TaskFlow API')
    .setDescription('Task Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
