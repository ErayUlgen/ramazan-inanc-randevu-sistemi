import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

type CorrelatedRequest = Request & { correlationId?: string };

@Injectable()
export class RequestObservabilityMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HttpRequest');

  use(
    request: CorrelatedRequest,
    response: Response,
    next: NextFunction,
  ): void {
    const startedAt = process.hrtime.bigint();

    response.once('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      this.logger.log(
        JSON.stringify({
          event: 'http_request_completed',
          correlationId: request.correlationId,
          method: request.method,
          route: request.path || '/',
          statusCode: response.statusCode,
          durationMs: Math.round(durationMs * 10) / 10,
        }),
      );
    });

    next();
  }
}
