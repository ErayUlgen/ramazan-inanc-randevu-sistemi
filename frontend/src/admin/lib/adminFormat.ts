import type {
  AdminBooking,
  AdminBookingSource,
  AdminBookingStatus,
  AdminVisitStatus,
} from "../admin.types";

export const STATUS_META: Record<
  AdminBookingStatus,
  { label: string; shortLabel: string; tone: string }
> = {
  HOLD: { label: "Saat tutuluyor", shortLabel: "Tutuluyor", tone: "hold" },
  PENDING_APPROVAL: {
    label: "Onay bekliyor",
    shortLabel: "Bekliyor",
    tone: "pending",
  },
  CONFIRMED: { label: "Onaylandı", shortLabel: "Onaylı", tone: "confirmed" },
  REJECTED: {
    label: "Onaylanmadı",
    shortLabel: "Onaylanmadı",
    tone: "rejected",
  },
  CANCELLED: { label: "İptal edildi", shortLabel: "İptal", tone: "cancelled" },
  EXPIRED: {
    label: "Süresi doldu",
    shortLabel: "Süresi doldu",
    tone: "expired",
  },
};

export const SOURCE_LABELS: Record<AdminBookingSource, string> = {
  ONLINE: "Online",
  PHONE: "Telefon",
  ADMIN: "Yönetici",
  WALK_IN: "Salondan",
};

export const VISIT_META: Record<
  AdminVisitStatus,
  { label: string; shortLabel: string; tone: string }
> = {
  SCHEDULED: { label: "Onaylandı", shortLabel: "Onaylı", tone: "scheduled" },
  ARRIVED: {
    label: "Geçmiş legacy kaydı",
    shortLabel: "Geçmiş",
    tone: "scheduled",
  },
  IN_SERVICE: {
    label: "Geçmiş legacy kaydı",
    shortLabel: "Geçmiş",
    tone: "scheduled",
  },
  COMPLETED: {
    label: "Geçmiş legacy kaydı",
    shortLabel: "Geçmiş",
    tone: "scheduled",
  },
  NO_SHOW: { label: "Gelmedi", shortLabel: "Gelmedi", tone: "no-show" },
};

export const formatMoney = (kurus: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(kurus / 100);

export const formatTime = (iso: string, timezone = "Europe/Istanbul") =>
  new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso));

export const formatDateLong = (date: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(`${date}T12:00:00+03:00`));

export const formatDateShort = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));

export const todayInIstanbul = () =>
  new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date());

export const shiftDate = (date: string, amount: number) => {
  const value = new Date(`${date}T12:00:00+03:00`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
};

export function minutesInTimezone(
  iso: string,
  timezone = "Europe/Istanbul",
): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}

export const bookingSearchText = (booking: AdminBooking) =>
  [
    booking.publicCode,
    booking.customer?.fullName,
    booking.customer?.phone,
    booking.customerNameSnapshot,
    booking.customerPhoneSnapshot,
    booking.professional.name,
    ...booking.items.map((item) => item.serviceName),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");

export const bookingServiceLabel = (booking: AdminBooking) =>
  booking.items.map((item) => item.serviceName).join(" + ");

export const isFutureBooking = (booking: AdminBooking, serverNow: string) =>
  new Date(booking.startAt) > new Date(serverNow);
