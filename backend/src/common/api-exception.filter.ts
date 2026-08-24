import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { correlationId?: string }>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : this.safeTransportStatus(exception);
    const raw =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof raw === 'string'
        ? raw
        : raw && typeof raw === 'object' && 'message' in raw
          ? (raw as { message: string | string[] }).message
          : status === 413
            ? 'İstek içeriği izin verilen boyutu aşıyor.'
            : status === 500
              ? 'Beklenmeyen bir sunucu hatası oluştu.'
              : 'İstek tamamlanamadı.';

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          event: 'unhandled_request_error',
          correlationId: request.correlationId,
          method: request.method,
          path: request.path,
          errorName:
            exception instanceof Error ? exception.name : 'UnknownError',
        }),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.originalUrl,
      correlationId: request.correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  private safeTransportStatus(exception: unknown): number {
    if (!exception || typeof exception !== 'object') return 500;
    const candidate =
      'status' in exception
        ? exception.status
        : 'statusCode' in exception
          ? exception.statusCode
          : undefined;
    return typeof candidate === 'number' && candidate >= 400 && candidate < 500
      ? candidate
      : 500;
  }
}
