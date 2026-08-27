import { NotificationEventType } from '@prisma/client';
import { renderBookingSms, renderWaitlistSms } from './notification-templates';

describe('booking notification templates', () => {
  const booking = {
    publicCode: 'RI-TEST1234',
    startAt: new Date('2030-07-25T13:00:00.000Z'),
    professional: { name: 'Ramazan İnanç' },
  };

  it('does not imply approval for a received request', () => {
    const message = renderBookingSms(
      NotificationEventType.BOOKING_RECEIVED,
      booking,
    );
    expect(message).toContain('talebiniz alındı');
    expect(message).toContain('Yönetici onayından sonra');
    expect(message).not.toContain('Randevunuz onaylandı');
  });

  it('keeps internal rejection reasons out of the customer message', () => {
    const message = renderBookingSms(
      NotificationEventType.BOOKING_REJECTED,
      booking,
    );
    expect(message).toContain('onaylanamadı');
    expect(message).toContain(booking.publicCode);
  });

  it('includes the early-arrival instruction in confirmed messages', () => {
    const message = renderBookingSms(
      NotificationEventType.BOOKING_APPROVED,
      booking,
    );
    expect(message).toContain('15 dakika önce');
    expect(message).toContain('Ramazan İnanç');
  });

  it('creates a human review message with a direct secure survey link', () => {
    const message = renderBookingSms(
      NotificationEventType.REVIEW_REQUESTED,
      booking,
      { actionToken: 'review-token' },
    );
    expect(message).toContain('ziyaretiniz nasıldı');
    expect(message).toContain('/degerlendir/review-token');
  });

  it('creates a waitlist offer message with the secure offer route', () => {
    const message = renderWaitlistSms(NotificationEventType.WAITLIST_OFFERED, {
      startAt: '2030-07-25T13:00:00.000Z',
      professionalName: 'Ramazan İnanç',
      actionToken: 'waitlist-offer-token',
    });

    expect(message).toContain('Salon ekibimiz size bir randevu saati ayırdı');
    expect(message).toContain('/bekleme-listesi/teklif/waitlist-offer-token');
    expect(message).toContain('Ramazan İnanç');
  });

  it('confirms the booking immediately after an accepted waitlist offer', () => {
    const message = renderWaitlistSms(
      NotificationEventType.WAITLIST_OFFER_ACCEPTED,
      {
        startAt: '2030-07-25T13:00:00.000Z',
        professionalName: 'Ramazan İnanç',
        reference: 'RI-WAIT1234',
      },
    );

    expect(message).toContain('Randevunuz kesinleşti');
    expect(message).toContain('RI-WAIT1234');
  });
});
