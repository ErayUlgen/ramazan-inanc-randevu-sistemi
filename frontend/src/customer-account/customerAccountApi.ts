import type {
  BookingChangeAvailability,
  CustomerBookingDetail,
  CustomerBookingSummary,
  CustomerProfile,
  CustomerSession,
  CustomerSessionState,
  CustomerRebookSuggestion,
  CustomerReview,
  BookingSeriesFrequency,
  BookingSeriesPreview,
  CustomerBookingForm,
} from "./customerAccountTypes";

const API_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:3000/api`;

export class CustomerAccountApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CustomerAccountApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message[0]
      : body?.message;
    throw new CustomerAccountApiError(
      message ?? "İşlem şu anda tamamlanamadı.",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const getCustomerSession = () =>
  request<CustomerSessionState>("/customer-account/session");

export const requestCustomerCode = (phone: string) =>
  request<{
    accepted: true;
    challengeId: string;
    expiresInSeconds: number;
    resendAfterSeconds: number;
    message: string;
    developmentCode?: string;
  }>("/customer-account/auth/request-code", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const verifyCustomerCode = (
  phone: string,
  challengeId: string,
  code: string,
) =>
  request<CustomerSession>("/customer-account/auth/verify-code", {
    method: "POST",
    body: JSON.stringify({ phone, challengeId, code }),
  });

export const logoutCustomer = () =>
  request<{ authenticated: false }>("/customer-account/session", {
    method: "DELETE",
  });

export const getCustomerProfile = () =>
  request<CustomerProfile>("/customer-account/profile");

export const updateCustomerProfile = (payload: {
  fullName: string;
  email?: string | null;
  smsNotificationsEnabled: boolean;
}) =>
  request<CustomerProfile>("/customer-account/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const getCustomerBookings = (
  view: "pending" | "upcoming" | "history",
  cursor?: string,
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams({ view });
  if (cursor) query.set("cursor", cursor);
  return request<{
    items: CustomerBookingSummary[];
    nextCursor: string | null;
  }>(`/customer-account/bookings?${query}`, { signal });
};

export const getCustomerBooking = (publicCode: string) =>
  request<CustomerBookingDetail>(
    `/customer-account/bookings/${encodeURIComponent(publicCode)}`,
  );

export const getCustomerBookingForms = (publicCode: string) =>
  request<CustomerBookingForm[]>(
    `/customer-account/bookings/${encodeURIComponent(publicCode)}/forms`,
  );

export const submitCustomerBookingForm = (
  publicCode: string,
  submissionId: string,
  answers: Record<string, unknown>,
) =>
  request<{ id: string; status: string; submittedAt: string }>(
    `/customer-account/bookings/${encodeURIComponent(publicCode)}/forms/${encodeURIComponent(submissionId)}/submit`,
    { method: "POST", body: JSON.stringify({ answers }) },
  );

export const getCustomerRebookSuggestion = (publicCode: string) =>
  request<CustomerRebookSuggestion>(
    `/customer-account/bookings/${encodeURIComponent(publicCode)}/rebook`,
  );

export const getCustomerBookingAvailability = (
  publicCode: string,
  date: string,
  professionalId?: string,
) => {
  const query = new URLSearchParams({ date });
  if (professionalId) query.set("professionalId", professionalId);
  return request<BookingChangeAvailability>(
    `/customer-account/bookings/${encodeURIComponent(publicCode)}/availability?${query}`,
  );
};

export const createCustomerChangeRequest = (
  publicCode: string,
  payload: {
    date: string;
    startTime: string;
    professionalId: string;
    expectedRevision: number;
    reason?: string;
  },
) =>
  request(
    `/customer-account/bookings/${encodeURIComponent(publicCode)}/change-requests`,
    { method: "POST", body: JSON.stringify(payload) },
  );

export const cancelCustomerBooking = (publicCode: string, reason: string) =>
  request(
    `/customer-account/bookings/${encodeURIComponent(publicCode)}/cancel`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );

export const getCustomerReview = (publicCode: string) =>
  request<CustomerReview>(
    `/customer-account/bookings/${encodeURIComponent(publicCode)}/review`,
  );

export const submitCustomerReview = (
  publicCode: string,
  payload: { rating: number; comment?: string },
) =>
  request<{
    submitted: true;
    review: CustomerReview;
    googleReviewUrl: string | null;
  }>(`/customer-account/bookings/${encodeURIComponent(publicCode)}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export type BookingSeriesInput = {
  professionalId: string;
  serviceId: string;
  startDate: string;
  startTime: string;
  frequency: BookingSeriesFrequency;
  occurrenceCount: number;
};

export const previewCustomerBookingSeries = (payload: BookingSeriesInput) =>
  request<BookingSeriesPreview>("/customer-account/booking-series/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createCustomerBookingSeries = (
  payload: BookingSeriesInput & { idempotencyKey: string },
) =>
  request<{
    id: string;
    status: string;
    occurrenceCount: number;
    bookings: Array<{
      id: string;
      publicCode: string;
      startAt: string;
      status: string;
      occurrenceIndex: number;
    }>;
  }>("/customer-account/booking-series", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getCustomerBookingSeries = (id: string) =>
  request<{
    id: string;
    frequency: BookingSeriesFrequency;
    status: string;
    occurrenceCount: number;
    bookings: Array<{
      id: string;
      publicCode: string;
      startAt: string;
      status: string;
      occurrenceIndex: number;
      isSeriesException?: boolean;
    }>;
  }>(`/customer-account/booking-series/${encodeURIComponent(id)}`);

export const cancelCustomerBookingSeries = (
  id: string,
  fromOccurrence: number,
) =>
  request<{ cancelled: true; count: number }>(
    `/customer-account/booking-series/${encodeURIComponent(id)}?${new URLSearchParams({ fromOccurrence: String(fromOccurrence) })}`,
    { method: "DELETE" },
  );

export const getPublicReview = (token: string) =>
  request<CustomerReview>(`/public/reviews/${encodeURIComponent(token)}`);

export const submitPublicReview = (
  token: string,
  payload: { rating: number; comment?: string },
) =>
  request<{
    submitted: true;
    review: CustomerReview;
    googleReviewUrl: string | null;
  }>(`/public/reviews/${encodeURIComponent(token)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const downloadCustomerCalendar = async (publicCode: string) => {
  const response = await fetch(
    `${API_URL}/customer-account/bookings/${encodeURIComponent(publicCode)}/calendar.ics`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new CustomerAccountApiError(
      "Takvim dosyası hazırlanamadı.",
      response.status,
    );
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ramazan-inanc-${publicCode.toLowerCase()}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
};
