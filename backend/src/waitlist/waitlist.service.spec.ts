import { WaitlistService } from './waitlist.service';

describe('WaitlistService offer session', () => {
  const service = new WaitlistService(
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
  );

  it('stores offer access in a short-lived strict HttpOnly cookie', () => {
    const token = 'secure-offer-token';
    const expiresAt = new Date(Date.now() + 8 * 60_000);
    const cookie = service.offerSessionCookie(token, expiresAt);

    expect(cookie).toContain(`ri_waitlist_offer_access=${token}`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/waitlist/offers');
    expect(cookie).toMatch(/Max-Age=\d+/);
    expect(service.readOfferCookie(cookie)).toBe(token);
  });
});
