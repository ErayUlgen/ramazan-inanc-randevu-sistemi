import {
  ForbiddenException,
  Injectable,
  type NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SESSION_COOKIE_PATTERN =
  /(?:^|;\s*)(ri_admin_session|ri_customer_session)=/;

@Injectable()
export class OriginValidationMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    if (
      process.env.NODE_ENV !== 'production' ||
      SAFE_METHODS.has(request.method) ||
      !SESSION_COOKIE_PATTERN.test(request.headers.cookie ?? '') ||
      request.path.endsWith('/notifications/sms/webhook')
    ) {
      next();
      return;
    }

    const origin = this.resolveOrigin(request);
    if (!origin || !this.allowedOrigins().has(origin)) {
      throw new ForbiddenException(
        'İstek güvenlik doğrulamasından geçemedi. Sayfayı yenileyip tekrar deneyin.',
      );
    }
    next();
  }

  private resolveOrigin(request: Request): string | null {
    const directOrigin = request.header('origin');
    if (directOrigin) return this.normalize(directOrigin);

    const referer = request.header('referer');
    if (!referer) return null;
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  private allowedOrigins(): Set<string> {
    return new Set(
      [process.env.FRONTEND_URL, process.env.PUBLIC_APP_URL]
        .flatMap((value) => value?.split(',') ?? [])
        .map((value) => this.normalize(value))
        .filter((value): value is string => Boolean(value)),
    );
  }

  private normalize(value: string): string | null {
    try {
      return new URL(value.trim()).origin;
    } catch {
      return null;
    }
  }
}
