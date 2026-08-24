import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SESSION_DURATION_SECONDS = 30 * 60;

export type BookingAccessSessionPayload = {
  bookingId: string;
  challengeId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

@Injectable()
export class BookingAccessSessionService {
  readonly cookieName = 'ri_booking_access';

  create(bookingId: string, challengeId: string) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: BookingAccessSessionPayload = {
      bookingId,
      challengeId,
      issuedAt,
      expiresAt: issuedAt + SESSION_DURATION_SECONDS,
      nonce: randomBytes(16).toString('base64url'),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return {
      token: `${encoded}.${this.sign(encoded)}`,
      expiresAt: new Date(payload.expiresAt * 1000).toISOString(),
    };
  }

  verify(token: string | undefined): BookingAccessSessionPayload {
    if (!token) throw this.unauthorized();
    const [encoded, signature, extra] = token.split('.');
    if (
      !encoded ||
      !signature ||
      extra ||
      !this.safeEquals(signature, this.sign(encoded))
    ) {
      throw this.unauthorized();
    }
    try {
      const payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as Partial<BookingAccessSessionPayload>;
      const now = Math.floor(Date.now() / 1000);
      if (
        typeof payload.bookingId !== 'string' ||
        typeof payload.challengeId !== 'string' ||
        typeof payload.issuedAt !== 'number' ||
        typeof payload.expiresAt !== 'number' ||
        typeof payload.nonce !== 'string' ||
        payload.expiresAt <= now ||
        payload.issuedAt > now + 60
      )
        throw this.unauthorized();
      return payload as BookingAccessSessionPayload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw this.unauthorized();
    }
  }

  sessionCookie(token: string): string {
    return [
      `${this.cookieName}=${token}`,
      'Path=/api/booking-access',
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${SESSION_DURATION_SECONDS}`,
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  clearCookie(): string {
    return [
      `${this.cookieName}=`,
      'Path=/api/booking-access',
      'HttpOnly',
      'SameSite=Strict',
      'Max-Age=0',
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  readCookie(header: string | undefined): string | undefined {
    if (!header) return undefined;
    for (const part of header.split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      if (part.slice(0, separator).trim() === this.cookieName) {
        return part.slice(separator + 1).trim();
      }
    }
    return undefined;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.secret())
      .update(value)
      .digest('base64url');
  }

  private secret(): string {
    const value = process.env.BOOKING_ACCESS_SESSION_SECRET;
    if (!value || value.length < 32) {
      throw new Error(
        'BOOKING_ACCESS_SESSION_SECRET en az 32 karakter olmalıdır.',
      );
    }
    return value;
  }

  private safeEquals(left: string, right: string): boolean {
    const leftHash = createHash('sha256').update(left).digest();
    const rightHash = createHash('sha256').update(right).digest();
    return timingSafeEqual(leftHash, rightHash);
  }

  private unauthorized() {
    return new UnauthorizedException('Randevu erişim oturumu geçerli değil.');
  }
}
