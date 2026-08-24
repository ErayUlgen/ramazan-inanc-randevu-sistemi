import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CustomerSessionService,
  type CustomerIdentity,
} from './customer-session.service';

export type CustomerRequest = Request & {
  customerIdentity?: CustomerIdentity;
};

@Injectable()
export class CustomerSessionGuard implements CanActivate {
  constructor(private readonly sessions: CustomerSessionService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<CustomerRequest>();
    try {
      request.customerIdentity = await this.sessions.verify(
        this.sessions.readCookie(request.header('cookie')),
      );
      return true;
    } catch {
      throw new UnauthorizedException('Müşteri oturumu geçerli değil.');
    }
  }
}
