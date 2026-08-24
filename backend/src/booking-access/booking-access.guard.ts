import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  BookingAccessSessionService,
  type BookingAccessSessionPayload,
} from './booking-access-session.service';

export type BookingAccessRequest = Request & {
  bookingAccess?: BookingAccessSessionPayload;
};

@Injectable()
export class BookingAccessGuard implements CanActivate {
  constructor(private readonly sessions: BookingAccessSessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<BookingAccessRequest>();
    try {
      request.bookingAccess = this.sessions.verify(
        this.sessions.readCookie(request.header('cookie')),
      );
      return true;
    } catch {
      throw new UnauthorizedException('Randevu erişim oturumu geçerli değil.');
    }
  }
}
