import { NotificationEventType } from '@prisma/client';
import {
  buildActionToken,
  publicActionUrl,
  publicWaitlistOfferUrl,
} from '../common/action-token';

type TemplateBooking = {
  id: string;
  revision: number;
  publicCode: string;
  startAt: Date;
  professional: { name: string };
};

type TemplatePayload = {
  newStartAt?: string;
  newProfessionalName?: string;
  requestedStartAt?: string;
  requestedProfessionalName?: string;
  actionToken?: string;
};

export function renderBookingSms(
  eventType: NotificationEventType,
  booking: TemplateBooking,
  payload?: TemplatePayload,
): string {
  const date = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Istanbul',
  }).format(booking.startAt);
  const time = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Istanbul',
  }).format(booking.startAt);

  switch (eventType) {
    case NotificationEventType.BOOKING_RECEIVED:
      return `Ramazan İnanç Hair Art Studio: Randevu talebiniz alındı. Yönetici onayından sonra bilgilendirileceksiniz. Referans: ${booking.publicCode}`;
    case NotificationEventType.BOOKING_APPROVED:
      return `Randevunuz onaylandı. ${date} ${time}, ${booking.professional.name}. En iyi deneyim için 15 dakika önce salonda olmanızı rica ederiz. Referans: ${booking.publicCode}`;
    case NotificationEventType.BOOKING_REJECTED:
      return `Randevu talebiniz bu saat için onaylanamadı. Yeni bir saat seçmek için randevu sayfamızı ziyaret edebilirsiniz. Referans: ${booking.publicCode}`;
    case NotificationEventType.BOOKING_CANCELLED:
      return `Onaylı randevunuz iptal edildi. Detay ve yeni randevu için randevu takip sayfamızı kullanabilirsiniz. Referans: ${booking.publicCode}`;
    case NotificationEventType.BOOKING_CREATED_BY_ADMIN:
      return `Randevunuz oluşturuldu. ${date} ${time}, ${booking.professional.name}. En iyi deneyim için 15 dakika önce salonda olmanızı rica ederiz. Referans: ${booking.publicCode}`;
    case NotificationEventType.BOOKING_RESCHEDULED: {
      const nextStart = payload?.newStartAt
        ? new Date(payload.newStartAt)
        : booking.startAt;
      const nextDate = new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        timeZone: 'Europe/Istanbul',
      }).format(nextStart);
      const nextTime = new Intl.DateTimeFormat('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Istanbul',
      }).format(nextStart);
      return `Randevunuz güncellendi. Yeni zaman: ${nextDate} ${nextTime}, ${payload?.newProfessionalName ?? booking.professional.name}. En iyi deneyim için 15 dakika önce salonda olmanızı rica ederiz. Referans: ${booking.publicCode}`;
    }
    case NotificationEventType.BOOKING_REMINDER:
      return `Bugün ${time}'daki randevunuzu hatırlatmak istedik. En iyi deneyim için 15 dakika önce Ramazan İnanç Hair Art Studio'da olmanızı rica ederiz.`;
    case NotificationEventType.CHANGE_REQUEST_RECEIVED:
      return `Randevu değişiklik talebiniz alındı. Mevcut randevunuz yönetici kararına kadar korunur. Referans: ${booking.publicCode}`;
    case NotificationEventType.CHANGE_REQUEST_APPROVED: {
      const requested = payload?.requestedStartAt
        ? new Date(payload.requestedStartAt)
        : booking.startAt;
      const requestedDate = new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        timeZone: 'Europe/Istanbul',
      }).format(requested);
      const requestedTime = new Intl.DateTimeFormat('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Istanbul',
      }).format(requested);
      return `Randevu değişikliğiniz onaylandı. ${requestedDate} ${requestedTime}, ${payload?.requestedProfessionalName ?? booking.professional.name}. Referans: ${booking.publicCode}`;
    }
    case NotificationEventType.CHANGE_REQUEST_REJECTED:
      return `Randevu değişiklik talebiniz onaylanmadı. Mevcut randevunuz aynen korunuyor. Referans: ${booking.publicCode}`;
    case NotificationEventType.WAITLIST_JOINED:
    case NotificationEventType.WAITLIST_OFFERED:
    case NotificationEventType.WAITLIST_OFFER_ACCEPTED:
    case NotificationEventType.WAITLIST_OFFER_EXPIRED:
      return 'Ramazan İnanç Hair Art Studio bekleme listesi bildirimi.';
    case NotificationEventType.REVIEW_REQUESTED:
      return `Bugün ${time}'daki ziyaretiniz nasıldı? Görüşleriniz bizim için çok değerli. Kısa değerlendirme anketi: ${publicActionUrl('review', payload?.actionToken ?? buildActionToken('review', booking.id, booking.revision))}`;
    case NotificationEventType.REVIEW_SUBMITTED:
      return 'Değerlendirmeniz için teşekkür ederiz.';
  }
  return 'Ramazan İnanç Hair Art Studio bildirimi.';
}

export function renderWaitlistSms(
  eventType: NotificationEventType,
  payload: {
    startAt?: string;
    professionalName?: string;
    expiresAt?: string;
    reference?: string;
    actionToken?: string;
  },
) {
  const format = (value?: string) =>
    value
      ? new Intl.DateTimeFormat('tr-TR', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Europe/Istanbul',
        }).format(new Date(value))
      : '';
  switch (eventType) {
    case NotificationEventType.WAITLIST_JOINED:
      return `Ramazan İnanç Hair Art Studio: Bekleme listesi kaydınız oluşturuldu. Salon ekibimiz tercihlerinize uyan bir saat seçerse SMS ile bilgilendirileceksiniz.`;
    case NotificationEventType.WAITLIST_OFFERED:
      return `Salon ekibimiz size bir randevu saati ayırdı: ${format(payload.startAt)}, ${payload.professionalName ?? 'uygun uzman'}. Süresi dolmadan kabul edin: ${payload.actionToken ? publicWaitlistOfferUrl(payload.actionToken) : 'randevu sayfamızı ziyaret edin'}`;
    case NotificationEventType.WAITLIST_OFFER_ACCEPTED:
      return `Randevunuz kesinleşti. ${format(payload.startAt)}, ${payload.professionalName ?? 'uygun uzman'}. Referans: ${payload.reference ?? '-'}. Sizi salonda bekliyoruz.`;
    case NotificationEventType.WAITLIST_OFFER_EXPIRED:
      return `Bekleme listesi teklifinizin süresi doldu. Kaydınız uygunsa yeni boşluklar için aktif kalacaktır.`;
    default:
      return 'Ramazan İnanç Hair Art Studio bildirimi.';
  }
}
