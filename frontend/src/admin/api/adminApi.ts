import type {
  AdminAuditEvent,
  AdminAvailability,
  AdminBooking,
  AdminBookingBoard,
  AdminBookingNotification,
  AdminBookingSource,
  AdminBusinessHours,
  AdminCustomerDetail,
  AdminCustomerSearchItem,
  AdminManagedProfessional,
  AdminManagedService,
  AdminScheduleBlock,
  AdminScheduleBlockKind,
  AdminTimeInterval,
  AdminChangeRequest,
  AdminWaitlistEntry,
  AdminWaitlistSuggestion,
  AdminBookingPolicy,
  AdminOperationsReport,
  AdminActiveSession,
  AdminBookingSearchResponse,
  AdminBookingSeries,
  AdminWeekBoard,
  AdminIdentity,
  AdminProfessionalServiceSetting,
  AdminReview,
  AdminReviewSummary,
  AdminTeamAccess,
} from "../admin.types";
import type {
  AdminFormTemplate,
  AdminBookingFormSubmission,
  AdminNotificationItem,
  AuditEvent,
  CalendarSubscription,
  CustomerCareProfile,
  CustomerMemory,
  NotificationRule,
} from "../sprint12.types";

const API_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:3000/api`;

export class AdminApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new AdminApiError(
      message ?? "İşlem şu anda tamamlanamadı.",
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export const getAdminSession = () =>
  adminRequest<
    | { authenticated: true; user: AdminIdentity }
    | { authenticated: false }
  >("/admin/session");

export const createAdminSession = (credentials: {
  accessKey?: string;
  username?: string;
  password?: string;
}) =>
  adminRequest<{
    authenticated: true;
    expiresAt: string;
    user: AdminIdentity;
  }>("/admin/session", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const deleteAdminSession = () =>
  adminRequest<{ authenticated: false }>("/admin/session", {
    method: "DELETE",
  });

export const getAdminBookingBoard = (branchSlug: string, date: string) => {
  const query = new URLSearchParams({ branchSlug, date });
  return adminRequest<AdminBookingBoard>(`/admin/booking-board?${query}`);
};

export const getAdminWeekBoard = (
  branchSlug: string,
  date: string,
  professionalId?: string,
) => {
  const query = new URLSearchParams({ branchSlug, date });
  if (professionalId) query.set("professionalId", professionalId);
  return adminRequest<AdminWeekBoard>(`/admin/booking-board/week?${query}`);
};

export const searchAdminBookings = (input: {
  from?: string;
  to?: string;
  query?: string;
  status?: string;
  visitStatus?: string;
  professionalId?: string;
  source?: string;
  cursor?: string;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return adminRequest<AdminBookingSearchResponse>(`/admin/bookings?${query}`);
};

export const decideAdminBooking = (
  id: string,
  decision: "APPROVE" | "REJECT",
  reason?: string,
) =>
  adminRequest<AdminBooking>(`/admin/bookings/${id}/decision`, {
    method: "PATCH",
    body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }),
  });

export const cancelAdminBooking = (id: string, reason: string) =>
  adminRequest<AdminBooking>(`/admin/bookings/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });

export const getBookingNotifications = (bookingId: string) =>
  adminRequest<AdminBookingNotification[]>(
    `/admin/bookings/${bookingId}/notifications`,
  );

export const retryBookingNotification = (id: string) =>
  adminRequest<AdminBookingNotification>(`/admin/notifications/${id}/retry`, {
    method: "POST",
  });

export type AdminBookingPayload = {
  branchSlug: string;
  source: Exclude<AdminBookingSource, "ONLINE">;
  fullName: string;
  phone?: string;
  serviceIds: string[];
  professionalId: string;
  date: string;
  startTime: string;
  customerNote?: string;
  adminNote?: string;
  notificationsEnabled: boolean;
};

export const createAdminBooking = (payload: AdminBookingPayload) =>
  adminRequest<AdminBooking>("/admin/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createAdminBookingSeries = (payload: {
  professionalId: string;
  serviceId: string;
  startDate: string;
  startTime: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "FOUR_WEEKLY" | "MONTHLY";
  occurrenceCount: number;
  idempotencyKey: string;
  fullName: string;
  phone: string;
}) =>
  adminRequest<{
    id: string;
    occurrenceCount: number;
    bookings: Array<{
      id: string;
      publicCode: string;
      startAt: string;
      status: string;
    }>;
  }>("/admin/booking-series", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getAdminBookingSeries = (id: string) =>
  adminRequest<AdminBookingSeries>(`/admin/booking-series/${id}`);

export const cancelAdminBookingSeries = (id: string, fromOccurrence: number) =>
  adminRequest<{ cancelled: true; count: number }>(
    `/admin/booking-series/${id}?fromOccurrence=${fromOccurrence}`,
    { method: "DELETE" },
  );

export const getAdminAvailability = (input: {
  branchSlug: string;
  date: string;
  serviceIds: string[];
  professionalId?: string;
  excludeBookingId?: string;
}) => {
  const query = new URLSearchParams({
    branchSlug: input.branchSlug,
    date: input.date,
    serviceIds: input.serviceIds.join(","),
  });
  if (input.professionalId) query.set("professionalId", input.professionalId);
  if (input.excludeBookingId)
    query.set("excludeBookingId", input.excludeBookingId);
  return adminRequest<AdminAvailability>(`/admin/availability?${query}`);
};

export const rescheduleAdminBooking = (
  id: string,
  payload: {
    expectedRevision: number;
    serviceIds: string[];
    professionalId: string;
    date: string;
    startTime: string;
    allowOverride?: boolean;
    overrideReason?: string;
  },
) =>
  adminRequest<AdminBooking>(`/admin/bookings/${id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const previewAdminBookingReschedule = (
  id: string,
  payload: {
    expectedRevision: number;
    serviceIds: string[];
    professionalId: string;
    date: string;
    startTime: string;
  },
) =>
  adminRequest<{
    valid: boolean;
    requiresOverride: boolean;
    startAt: string;
    endAt: string;
    reason?: string;
  }>(`/admin/bookings/${id}/reschedule-preview`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateAdminBookingDetails = (
  id: string,
  payload: {
    expectedRevision: number;
    fullName: string;
    phone?: string;
    customerNote?: string;
    adminNote?: string;
    notificationsEnabled: boolean;
  },
) =>
  adminRequest<AdminBooking>(`/admin/bookings/${id}/details`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const markAdminBookingNoShow = (
  id: string,
  expectedRevision: number,
  note?: string,
) =>
  adminRequest<AdminBooking>(`/admin/bookings/${id}/no-show`, {
    method: "POST",
    body: JSON.stringify({
      expectedRevision,
      ...(note ? { note } : {}),
    }),
  });

export const revertAdminBookingNoShow = (
  id: string,
  expectedRevision: number,
  reason: string,
) =>
  adminRequest<AdminBooking>(`/admin/bookings/${id}/no-show/revert`, {
    method: "POST",
    body: JSON.stringify({ expectedRevision, reason }),
  });

export const getBookingAudit = (bookingId: string) =>
  adminRequest<AdminAuditEvent[]>(`/admin/bookings/${bookingId}/audit`);

export const searchAdminCustomers = (queryValue: string) => {
  const query = new URLSearchParams({ query: queryValue, take: "30" });
  return adminRequest<{
    items: AdminCustomerSearchItem[];
    nextCursor: string | null;
  }>(`/admin/customers?${query}`);
};

export const getAdminCustomer = (id: string) =>
  adminRequest<AdminCustomerDetail>(`/admin/customers/${id}`);

export const updateAdminCustomer = (
  id: string,
  payload: { fullName?: string; internalNote?: string },
) =>
  adminRequest<
    Pick<
      AdminCustomerDetail,
      "id" | "fullName" | "phone" | "email" | "internalNote"
    >
  >(`/admin/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const updateCustomerOnlineBookingAccess = (
  id: string,
  payload: { blocked: boolean; reason?: string },
) =>
  adminRequest<{
    id: string;
    onlineBookingBlockedAt: string | null;
    onlineBookingBlockReason: string | null;
  }>(`/admin/customers/${id}/online-booking-access`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const getCustomerMemory = (id: string) =>
  adminRequest<CustomerMemory>(`/admin/customers/${id}/memory`);

export const updateCustomerCareProfile = (
  id: string,
  payload: Partial<CustomerCareProfile>,
) =>
  adminRequest<CustomerCareProfile>(`/admin/customers/${id}/care-profile`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const getCustomerTags = () =>
  adminRequest<Array<{ id: string; name: string; color: string }>>(
    "/admin/customer-tags",
  );

export const createCustomerTag = (payload: {
  name: string;
  color?: string;
}) =>
  adminRequest<{ id: string; name: string; color: string }>(
    "/admin/customer-tags",
    { method: "POST", body: JSON.stringify(payload) },
  );

export const setCustomerTags = (id: string, tagIds: string[]) =>
  adminRequest(`/admin/customers/${id}/tags`, {
    method: "PATCH",
    body: JSON.stringify({ tagIds }),
  });

export const createCustomerServiceRecord = (
  customerId: string,
  payload: {
    bookingId?: string;
    serviceId?: string;
    professionalId?: string;
    technique?: string;
    formulaNote?: string;
    productNote?: string;
    resultNote?: string;
    nextVisitRecommendation?: string;
  },
) =>
  adminRequest(`/admin/customers/${customerId}/service-records`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const reviseCustomerServiceRecord = (
  recordId: string,
  payload: {
    technique?: string;
    formulaNote?: string;
    productNote?: string;
    resultNote?: string;
    nextVisitRecommendation?: string;
  },
) =>
  adminRequest(`/admin/customer-service-records/${recordId}/revisions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const previewCustomerMerge = (
  primaryId: string,
  sourceCustomerId: string,
) =>
  adminRequest(`/admin/customers/${primaryId}/merge-preview`, {
    method: "POST",
    body: JSON.stringify({ sourceCustomerId }),
  });

export const mergeCustomer = (
  primaryId: string,
  sourceCustomerId: string,
) =>
  adminRequest(`/admin/customers/${primaryId}/merge`, {
    method: "POST",
    body: JSON.stringify({ sourceCustomerId }),
  });

export const getAdminServices = (branchId: string) =>
  adminRequest<AdminManagedService[]>(
    `/admin/services?${new URLSearchParams({ branchId })}`,
  );

export const saveAdminService = (
  id: string | null,
  payload: Omit<
    AdminManagedService,
    "id" | "slug" | "historicalBookingCount" | "updatedAt"
  > & {
    branchId: string;
  },
) =>
  adminRequest<AdminManagedService>(
    id ? `/admin/services/${id}` : "/admin/services",
    {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    },
  );

export const getAdminProfessionals = (branchId: string) =>
  adminRequest<AdminManagedProfessional[]>(
    `/admin/professionals?${new URLSearchParams({ branchId })}`,
  );

export const saveAdminProfessional = (
  id: string | null,
  payload: Omit<AdminManagedProfessional, "id" | "slug" | "updatedAt"> & {
    branchId: string;
  },
) =>
  adminRequest<AdminManagedProfessional>(
    id ? `/admin/professionals/${id}` : "/admin/professionals",
    { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) },
  );

export const getProfessionalServiceSettings = (professionalId: string) =>
  adminRequest<{
    professional: { id: string; name: string; title: string };
    services: AdminProfessionalServiceSetting[];
  }>(`/admin/catalog/professionals/${professionalId}/services`);

export const updateProfessionalServiceSetting = (
  professionalId: string,
  serviceId: string,
  payload: {
    isAssigned: boolean;
    durationMinutesOverride: number | null;
    priceKurusOverride: number | null;
    isOnlineBookableOverride: boolean | null;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    processingStartOffsetMinutes: number | null;
    processingDurationMinutes: number;
  },
) =>
  adminRequest<{
    professional: { id: string; name: string; title: string };
    services: AdminProfessionalServiceSetting[];
  }>(`/admin/catalog/professionals/${professionalId}/services/${serviceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const getFormTemplates = () =>
  adminRequest<AdminFormTemplate[]>("/admin/form-templates");

export const createFormTemplate = (payload: {
  name: string;
  description?: string;
  title: string;
  fields: AdminFormTemplate["versions"][number]["definition"]["fields"];
}) =>
  adminRequest<AdminFormTemplate>("/admin/form-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateFormDraft = (
  id: string,
  payload: {
    name?: string;
    description?: string;
    title: string;
    fields: AdminFormTemplate["versions"][number]["definition"]["fields"];
  },
) =>
  adminRequest<AdminFormTemplate>(`/admin/form-templates/${id}/draft`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const publishFormTemplate = (id: string) =>
  adminRequest<AdminFormTemplate>(`/admin/form-templates/${id}/publish`, {
    method: "POST",
  });

export const archiveFormTemplate = (id: string) =>
  adminRequest<AdminFormTemplate>(`/admin/form-templates/${id}/archive`, {
    method: "POST",
  });

export const setFormRequirements = (
  id: string,
  requirements: Array<{
    serviceId: string;
    isRequired: boolean;
    sortOrder?: number;
  }>,
) =>
  adminRequest(`/admin/form-templates/${id}/service-requirements`, {
    method: "PUT",
    body: JSON.stringify({ requirements }),
  });

export const getAdminBookingForms = (bookingId: string) =>
  adminRequest<AdminBookingFormSubmission[]>(
    `/admin/bookings/${bookingId}/forms`,
  );

export const reviewAdminBookingForm = (submissionId: string) =>
  adminRequest<AdminBookingFormSubmission>(
    `/admin/booking-form-submissions/${submissionId}/review`,
    { method: "POST", body: JSON.stringify({ reviewed: true }) },
  );

export const getNotificationRules = () =>
  adminRequest<NotificationRule[]>("/admin/notification-rules");

export const saveNotificationRule = (
  id: string | null,
  payload: Omit<NotificationRule, "id">,
) =>
  adminRequest<NotificationRule>(
    id ? `/admin/notification-rules/${id}` : "/admin/notification-rules",
    { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) },
  );

export const getAdminNotificationCenter = (
  status?: string,
  cursor?: string,
) => {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (cursor) query.set("cursor", cursor);
  return adminRequest<{
    items: AdminNotificationItem[];
    nextCursor: string | null;
  }>(`/admin/notifications?${query}`);
};

export const retryAdminNotification = (id: string) =>
  adminRequest<AdminNotificationItem>(`/admin/notifications/${id}/retry`, {
    method: "POST",
  });

export const getCalendarSubscriptions = () =>
  adminRequest<CalendarSubscription[]>("/admin/calendar-subscriptions");

export const createCalendarSubscription = (payload: {
  label: string;
  scope: "BRANCH" | "PROFESSIONAL";
  professionalId?: string;
  expiresAt?: string;
}) =>
  adminRequest<CalendarSubscription & { url: string }>(
    "/admin/calendar-subscriptions",
    { method: "POST", body: JSON.stringify(payload) },
  );

export const rotateCalendarSubscription = (id: string) =>
  adminRequest<CalendarSubscription & { url: string }>(
    `/admin/calendar-subscriptions/${id}/rotate`,
    { method: "POST" },
  );

export const revokeCalendarSubscription = (id: string) =>
  adminRequest<CalendarSubscription>(`/admin/calendar-subscriptions/${id}`, {
    method: "DELETE",
  });

export const getAuditEvents = (input: {
  from: string;
  to: string;
  action?: string;
  entityType?: string;
  cursor?: string;
}) => {
  const query = new URLSearchParams(
    Object.entries(input).filter(([, value]) => Boolean(value)) as string[][],
  );
  return adminRequest<{
    items: AuditEvent[];
    nextCursor: string | null;
  }>(`/admin/audit-events?${query}`);
};

export const adminExportUrl = (
  type:
    | "bookings"
    | "customers"
    | "services"
    | "professionals"
    | "notifications",
  from: string,
  to: string,
) =>
  `${API_URL}/admin/exports.csv?${new URLSearchParams({ type, from, to })}`;

export const getBusinessHours = (branchId: string) =>
  adminRequest<AdminBusinessHours>(`/admin/branches/${branchId}/hours`);

export const updateBusinessHours = (
  branchId: string,
  days: Array<{ weekday: number; intervals: AdminTimeInterval[] }>,
) =>
  adminRequest<{ days: AdminBusinessHours["days"] }>(
    `/admin/branches/${branchId}/hours`,
    { method: "PUT", body: JSON.stringify({ days }) },
  );

export const upsertDateOverride = (
  branchId: string,
  date: string,
  payload: { isClosed: boolean; note?: string; intervals: AdminTimeInterval[] },
) =>
  adminRequest<AdminBusinessHours["overrides"][number]>(
    `/admin/branches/${branchId}/date-overrides/${date}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );

export const deleteDateOverride = (branchId: string, date: string) =>
  adminRequest<{ removed: true }>(
    `/admin/branches/${branchId}/date-overrides/${date}`,
    { method: "DELETE" },
  );

export const getScheduleBlocks = (branchId: string, date: string) =>
  adminRequest<AdminScheduleBlock[]>(
    `/admin/schedule-blocks?${new URLSearchParams({ branchId, date })}`,
  );

export const createScheduleBlock = (payload: {
  branchId: string;
  professionalId?: string;
  kind: AdminScheduleBlockKind;
  title: string;
  internalNote?: string;
  date: string;
  startTime: string;
  endTime: string;
}) =>
  adminRequest<AdminScheduleBlock>("/admin/schedule-blocks", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateScheduleBlock = (
  id: string,
  payload: {
    branchId: string;
    professionalId?: string;
    kind: AdminScheduleBlockKind;
    title: string;
    internalNote?: string;
    date: string;
    startTime: string;
    endTime: string;
  },
) =>
  adminRequest<AdminScheduleBlock>(`/admin/schedule-blocks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const cancelScheduleBlock = (id: string, reason: string) =>
  adminRequest<{ cancelled: true }>(`/admin/schedule-blocks/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ reason }),
  });

export const getAdminChangeRequests = (branchId: string, status = "PENDING") =>
  adminRequest<AdminChangeRequest[]>(
    `/admin/booking-change-requests?${new URLSearchParams({ branchId, status })}`,
  );

export const decideAdminChangeRequest = (
  id: string,
  decision: "APPROVE" | "REJECT",
  reason?: string,
) =>
  adminRequest<AdminChangeRequest>(
    `/admin/booking-change-requests/${id}/decision`,
    {
      method: "PATCH",
      body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }),
    },
  );

export const getAdminWaitlist = (branchId: string, status?: string) => {
  const query = new URLSearchParams({ branchId });
  if (status) query.set("status", status);
  return adminRequest<AdminWaitlistEntry[]>(`/admin/waitlist?${query}`);
};

export const getAdminWaitlistSuggestions = () =>
  adminRequest<AdminWaitlistSuggestion[]>(`/admin/waitlist/suggestions`);

export const createAdminWaitlistSuggestionOffer = (
  suggestionId: string,
  entryId: string,
) =>
  adminRequest<AdminWaitlistEntry>(
    `/admin/waitlist/suggestions/${suggestionId}/offers`,
    {
    method: "POST",
      body: JSON.stringify({ entryId }),
    },
  );

export const cancelAdminWaitlistEntry = (id: string, reason: string) =>
  adminRequest<AdminWaitlistEntry>(`/admin/waitlist/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ reason }),
  });

export const getAdminBookingPolicy = (branchId: string) =>
  adminRequest<AdminBookingPolicy>(
    `/admin/branches/${branchId}/booking-policy`,
  );

export const updateAdminBookingPolicy = (
  branchId: string,
  policy: Omit<AdminBookingPolicy, "id" | "branchId" | "updatedAt">,
) =>
  adminRequest<AdminBookingPolicy>(
    `/admin/branches/${branchId}/booking-policy`,
    { method: "PUT", body: JSON.stringify(policy) },
  );

export const getAdminOperationsReport = (
  from: string,
  to: string,
  professionalId?: string,
  serviceId?: string,
  filters?: { source?: string; status?: string; visitStatus?: string },
) => {
  const query = new URLSearchParams({ from, to });
  if (professionalId) query.set("professionalId", professionalId);
  if (serviceId) query.set("serviceId", serviceId);
  if (filters?.source) query.set("source", filters.source);
  if (filters?.status) query.set("status", filters.status);
  if (filters?.visitStatus) query.set("visitStatus", filters.visitStatus);
  return adminRequest<AdminOperationsReport>(
    `/admin/reports/operations?${query}`,
  );
};

export const getAdminReviews = (filters?: {
  cursor?: string;
  professionalId?: string;
  rating?: number;
  unread?: boolean;
  from?: string;
  to?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return adminRequest<{ items: AdminReview[]; nextCursor: string | null }>(
    `/admin/reviews?${query}`,
  );
};

export const getAdminReviewSummary = (filters?: {
  from?: string;
  to?: string;
  professionalId?: string;
}) => {
  const query = new URLSearchParams();
  if (filters?.from) query.set("from", filters.from);
  if (filters?.to) query.set("to", filters.to);
  if (filters?.professionalId)
    query.set("professionalId", filters.professionalId);
  return adminRequest<AdminReviewSummary>(
    `/admin/reviews/summary${query.size ? `?${query}` : ""}`,
  );
};

export const updateAdminReview = (
  id: string,
  payload: { markRead?: boolean; adminNote?: string },
) =>
  adminRequest<AdminReview>(`/admin/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const getTeamAccess = () =>
  adminRequest<AdminTeamAccess[]>("/admin/team-access");

export const createTeamAccess = (payload: {
  username: string;
  displayName: string;
  password: string;
  role: "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";
  professionalId?: string | null;
}) =>
  adminRequest<AdminTeamAccess>("/admin/team-access", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateTeamAccess = (
  id: string,
  payload: {
    displayName?: string;
    role?: "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";
    professionalId?: string | null;
    isActive?: boolean;
  },
) =>
  adminRequest<AdminTeamAccess>(`/admin/team-access/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const resetTeamPassword = (id: string, password: string) =>
  adminRequest<{ reset: true }>(`/admin/team-access/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });

export const revokeTeamSessions = (id: string) =>
  adminRequest<{ revoked: true; count: number }>(
    `/admin/team-access/${id}/sessions`,
    {
      method: "DELETE",
    },
  );

export const getAdminActiveSessions = () =>
  adminRequest<AdminActiveSession[]>("/admin/session/active");

export const revokeAdminSession = (id: string) =>
  adminRequest<{ revoked: true }>(`/admin/session/active/${id}`, {
    method: "DELETE",
  });

export function createAdminEventSource() {
  return new EventSource(`${API_URL}/admin/events`, {
    withCredentials: true,
  });
}
