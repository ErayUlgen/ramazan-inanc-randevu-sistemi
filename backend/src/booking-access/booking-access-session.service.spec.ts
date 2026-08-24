import { UnauthorizedException } from '@nestjs/common';
import { BookingAccessSessionService } from './booking-access-session.service';

describe('BookingAccessSessionService', () => {
  const previousSecret = process.env.BOOKING_ACCESS_SESSION_SECRET;

  beforeAll(() => {
    process.env.BOOKING_ACCESS_SESSION_SECRET =
      'test-booking-access-session-secret-with-32-chars';
  });

  afterAll(() => {
    process.env.BOOKING_ACCESS_SESSION_SECRET = previousSecret;
  });

  it('creates a booking-scoped signed session', () => {
    const service = new BookingAccessSessionService();
    const session = service.create('booking-1', 'challenge-1');
    const payload = service.verify(session.token);

    expect(payload.bookingId).toBe('booking-1');
    expect(payload.challengeId).toBe('challenge-1');
    expect(service.sessionCookie(session.token)).toContain('HttpOnly');
    expect(service.sessionCookie(session.token)).toContain('SameSite=Strict');
  });

  it('rejects a tampered token', () => {
    const service = new BookingAccessSessionService();
    const session = service.create('booking-1', 'challenge-1');
    expect(() => service.verify(`${session.token}x`)).toThrow(
      UnauthorizedException,
    );
  });

  it('uses a cookie path isolated from the admin session', () => {
    const service = new BookingAccessSessionService();
    expect(service.clearCookie()).toContain('Path=/api/booking-access');
    expect(service.cookieName).toBe('ri_booking_access');
  });
});
