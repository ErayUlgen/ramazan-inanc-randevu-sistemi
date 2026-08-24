import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const requested = request.header('x-correlation-id');
    const correlationId =
      requested && /^[a-zA-Z0-9._-]{8,128}$/.test(requested)
        ? requested
        : randomUUID();
    response.setHeader('x-correlation-id', correlationId);
    (request as Request & { correlationId?: string }).correlationId =
      correlationId;
    next();
  }
}
