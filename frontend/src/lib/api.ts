import type {
  AvailabilityResponse,
  BookingHold,
  BranchCatalog,
  PublicBookingPolicy,
} from "../types";

const API_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:3000/api`;

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
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
    throw new Error(message ?? "İşlem şu anda tamamlanamadı.");
  }
  return response.json() as Promise<T>;
};

export const getCatalog = (slug: string) =>
  request<BranchCatalog>(`/public/branches/${slug}`);

export const getBookingPolicy = (slug: string) =>
  request<PublicBookingPolicy>(`/booking-policy/${slug}`);

export const getAvailability = (
  slug: string,
  date: string,
  serviceIds: string[],
  professionalId?: string,
) => {
  const query = new URLSearchParams({ date, serviceIds: serviceIds.join(",") });
  if (professionalId) query.set("professionalId", professionalId);
  return request<AvailabilityResponse>(
    `/public/branches/${slug}/availability?${query}`,
  );
};

export const createBookingHold = (payload: {
  branchSlug: string;
  serviceIds: string[];
  professionalId?: string;
  date: string;
  startTime: string;
}) =>
  request<BookingHold>("/public/bookings/holds", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const confirmBookingHold = (
  id: string,
  payload: {
    fullName?: string;
    phone?: string;
    verificationCode?: string;
    challengeId?: string;
    note?: string;
    holdToken: string;
  },
) =>
  request<{
    publicCode: string;
    status: string;
    message: string;
  }>(
    `/public/bookings/holds/${id}/confirm`,
    { method: "POST", body: JSON.stringify(payload) },
  );

export const requestBookingConfirmationCode = (
  id: string,
  payload: { phone: string; holdToken: string },
) =>
  request<{
    accepted: true;
    challengeId: string;
    expiresInSeconds: number;
    resendAfterSeconds: number;
    message: string;
    developmentCode?: string;
  }>(`/public/bookings/holds/${id}/request-code`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
