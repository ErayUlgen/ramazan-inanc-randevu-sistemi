import type {
  BookingAccessData,
  BookingChangeAvailability,
  PublicBookingPolicy,
} from "./bookingAccessTypes";

const API_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:3000/api`;

export class BookingAccessApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BookingAccessApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message[0]
      : body?.message;
    throw new BookingAccessApiError(
      message ?? "İşlem şu anda tamamlanamadı.",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const requestBookingAccessCode = (
  referenceCode: string,
  phone: string,
) =>
  request<{
    accepted: true;
    expiresInSeconds: number;
    resendAfterSeconds: number;
    message: string;
    developmentCode?: string;
  }>("/booking-access/request-code", {
    method: "POST",
    body: JSON.stringify({ referenceCode, phone }),
  });

export const verifyBookingAccessCode = (
  referenceCode: string,
  phone: string,
  code: string,
) =>
  request<{ authenticated: true; expiresAt: string }>(
    "/booking-access/verify-code",
    {
      method: "POST",
      body: JSON.stringify({ referenceCode, phone, code }),
    },
  );

export const getCurrentBooking = () =>
  request<BookingAccessData>("/booking-access/current");

export const closeBookingAccessSession = () =>
  request<{ authenticated: false }>("/booking-access/session", {
    method: "DELETE",
  });

export const getBookingChangeAvailability = (
  date: string,
  professionalId?: string,
) => {
  const query = new URLSearchParams({ date });
  if (professionalId) query.set("professionalId", professionalId);
  return request<BookingChangeAvailability>(
    `/booking-access/availability?${query.toString()}`,
  );
};

export const createBookingChangeRequest = (input: {
  date: string;
  startTime: string;
  professionalId: string;
  expectedRevision: number;
  reason?: string;
}) =>
  request("/booking-access/change-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const cancelCurrentBooking = (reason: string) =>
  request("/booking-access/cancel", {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const getPublicBookingPolicy = (branchSlug: string) =>
  request<PublicBookingPolicy>(`/booking-policy/${branchSlug}`);

export async function downloadBookingCalendar(filename: string) {
  const response = await fetch(`${API_URL}/booking-access/calendar.ics`, {
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new BookingAccessApiError(
      body?.message ?? "Takvim kaydı hazırlanamadı.",
      response.status,
    );
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
