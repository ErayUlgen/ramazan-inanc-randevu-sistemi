import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: false,
  });
  const configuredOrigins =
    process.env.FRONTEND_URL?.split(',').map((origin) => origin.trim()) ?? [];
  const developmentOrigins =
    process.env.NODE_ENV === 'production'
      ? []
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:5197',
          'http://127.0.0.1:5197',
        ];

  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT ?? '256kb';
  app.useBodyParser('json', { limit: requestBodyLimit });
  app.useBodyParser('urlencoded', {
    limit: requestBodyLimit,
    extended: true,
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [...new Set([...configuredOrigins, ...developmentOrigins])],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
