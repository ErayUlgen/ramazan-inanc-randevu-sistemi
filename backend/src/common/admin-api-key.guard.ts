import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const configuredKey = process.env.ADMIN_API_KEY;
    if (!configuredKey)
      throw new UnauthorizedException(
        'Yönetici API anahtarı yapılandırılmamış.',
      );
    const request = context.switchToHttp().getRequest<Request>();
    if (request.header('x-admin-key') !== configuredKey) {
      throw new UnauthorizedException('Yönetici yetkisi doğrulanamadı.');
    }
    return true;
  }
}
