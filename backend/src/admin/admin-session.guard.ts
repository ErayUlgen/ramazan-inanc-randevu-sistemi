import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import type { Request } from 'express';
import {
  type AdminIdentity,
  AdminSessionService,
} from './admin-session.service';
import {
  ADMIN_ROLES_KEY,
  PROFESSIONAL_SCOPE_PARAM_KEY,
} from './admin-authorization';

export type AdminRequest = Request & { adminIdentity?: AdminIdentity };

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(
    private readonly sessions: AdminSessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (
      process.env.NODE_ENV === 'production' &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    ) {
      const allowedOrigins = (process.env.FRONTEND_URL ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
      const origin = request.header('origin');
      if (!origin || !allowedOrigins.includes(origin)) {
        throw new ForbiddenException('İstek kaynağı doğrulanamadı.');
      }
    }
    const legacyKey = request.header('x-admin-key');
    if (this.sessions.isLegacyHeaderAllowed(legacyKey)) return true;

    const token = this.sessions.readCookie(request.header('cookie'));
    let identity: AdminIdentity;
    try {
      identity = await this.sessions.verify(token);
    } catch {
      throw new UnauthorizedException('Yönetici oturumu geçerli değil.');
    }
    request.adminIdentity = identity;
    if (identity.role === AdminRole.OWNER) return true;
    const allowedRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!allowedRoles?.includes(identity.role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmuyor.');
    }
    const scopeParam = this.reflector.getAllAndOverride<string>(
      PROFESSIONAL_SCOPE_PARAM_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (
      identity.role === AdminRole.PROFESSIONAL &&
      scopeParam &&
      request.params[scopeParam] !== identity.professionalId
    ) {
      throw new ForbiddenException(
        'Yalnız kendi uzman kaydınıza erişebilirsiniz.',
      );
    }
    return true;
  }
}
