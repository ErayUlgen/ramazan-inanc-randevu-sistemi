export type AdminBookingStatus =
  | "HOLD"
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type AdminBookingSource = "ONLINE" | "PHONE" | "ADMIN" | "WALK_IN";
export type AdminBookingSourceV2 = AdminBookingSource;

export type AdminVisitStatus =
  "SCHEDULED" | "ARRIVED" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW";

export interface AdminProfessional {
  id: string;
  slug: string;
  name: string;
  title: string;
  photoUrl?: string | null;
  isActive?: boolean;
  isOnlineBookable?: boolean;
  serviceIds?: string[];
}

export interface AdminBookingItem {
  id: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  priceKurus: number;
  sortOrder: number;
}

export interface AdminBooking {
  id: string;
  publicCode: string;
  status: AdminBookingStatus;
  source: AdminBookingSourceV2;
  visitStatus: AdminVisitStatus | null;
  seriesId: string | null;
  occurrenceIndex: number | null;
  isSeriesException: boolean;
  revision: number;
  scheduleOverride?: boolean;
  overrideReason?: string | null;
  startAt: string;
  endAt: string;
  totalDurationMinutes: number;
  totalPriceKurus: number;
  holdExpiresAt: string | null;
  customerNote: string | null;
  customerNameSnapshot: string | null;
  customerPhoneSnapshot: string | null;
  adminNote: string | null;
  notificationsEnabled: boolean;
  rejectionReason: string | null;
  cancellationReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  visitStatusUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
  } | null;
  professional: AdminProfessional;
  items: AdminBookingItem[];
  formStatus?: "NOT_REQUIRED" | "PENDING" | "COMPLETED" | "REVIEWED";
  formSubmissionCount?: number;
}

export interface AdminBookingSeries {
  id: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "FOUR_WEEKLY" | "MONTHLY";
  occurrenceCount: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  startsOn: string;
  endsOn: string | null;
  professionalId: string;
  bookings: Array<{
    id: string;
    publicCode: string;
    status: AdminBookingStatus;
    startAt: string;
    endAt: string;
    occurrenceIndex: number | null;
    isSeriesException: boolean;
  }>;
}

export interface AdminBookingBoard {
  serverNow: string;
  branch: {
    id: string;
    slug: string;
    name: string;
    city: string;
    timezone: string;
    openingMinute: number;
    closingMinute: number;
    workingIntervals: AdminTimeInterval[];
    isClosed: boolean;
    arrivalLeadMinutes: number;
    reminderLeadMinutes: number;
    pendingWarningMinutes: number;
  };
  professionals: AdminProfessional[];
  day: {
    date: string;
    bookings: AdminBooking[];
    scheduleBlocks: AdminScheduleBlock[];
  };
  pendingQueue: AdminBooking[];
  summary: {
    pendingTotal: number;
    dayActiveTotal: number;
    dayConfirmedTotal: number;
    pastTotal: number;
    noShowTotal: number;
    notificationFailures: number;
    nextBookingId: string | null;
  };
}

export interface AdminWeekBoard {
  serverNow: string;
  weekStart: string;
  weekEnd: string;
  branch: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
    openingMinute: number;
    closingMinute: number;
  };
  professionals: AdminProfessional[];
  selectedProfessional: AdminProfessional;
  days: Array<{
    date: string;
    isClosed: boolean;
    workingIntervals: AdminTimeInterval[];
  }>;
  bookings: AdminBooking[];
  scheduleBlocks: AdminScheduleBlock[];
}

export type AdminFilters = {
  professionalId: string;
  status: string;
  source: string;
  query: string;
};

export interface AdminBookingNotification {
  id: string;
  eventType:
    | "BOOKING_RECEIVED"
    | "BOOKING_APPROVED"
    | "BOOKING_REJECTED"
    | "BOOKING_CANCELLED"
    | "BOOKING_CREATED_BY_ADMIN"
    | "BOOKING_RESCHEDULED"
    | "BOOKING_REMINDER"
    | "CHANGE_REQUEST_RECEIVED"
    | "CHANGE_REQUEST_APPROVED"
    | "CHANGE_REQUEST_REJECTED"
    | "WAITLIST_JOINED"
    | "WAITLIST_OFFERED"
    | "WAITLIST_OFFER_ACCEPTED"
    | "WAITLIST_OFFER_EXPIRED"
    | "REVIEW_REQUESTED"
    | "REVIEW_SUBMITTED"
    | "FORM_PENDING";
  channel: "SMS";
  status:
    | "PENDING"
    | "PROCESSING"
    | "SENT"
    | "DELIVERED"
    | "RETRY_SCHEDULED"
    | "FAILED"
    | "SKIPPED"
    | "CANCELLED";
  scheduledFor: string;
  availableAt: string;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  provider: string | null;
  providerResponseCode: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  canRetry: boolean;
}

export interface AdminTimeInterval {
  startMinute: number;
  endMinute: number;
}

export type AdminScheduleBlockKind =
  "BREAK" | "UNAVAILABLE" | "TRAINING" | "PERSONAL" | "BRANCH_BLOCK" | "OTHER";

export interface AdminScheduleBlock {
  id: string;
  branchId?: string;
  professionalId: string | null;
  professional: AdminProfessional | null;
  kind: AdminScheduleBlockKind;
  title: string;
  internalNote: string | null;
  startAt: string;
  endAt: string;
  updatedAt: string;
}

export interface AdminAvailability {
  date: string;
  timezone: string;
  isClosed: boolean;
  workingIntervals: AdminTimeInterval[];
  totalDurationMinutes: number;
  totalPriceKurus: number;
  slots: Array<{
    startTime: string;
    endTime: string;
    availableProfessionalIds: string[];
  }>;
}

export interface AdminManagedService {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  preVisitInstructions: string | null;
  postVisitInstructions: string | null;
  durationMinutes: number;
  priceKurus: number;
  isActive: boolean;
  isOnlineBookable: boolean;
  sortOrder: number;
  professionalIds: string[];
  historicalBookingCount?: number;
  updatedAt?: string;
}

export interface AdminManagedProfessional {
  id: string;
  slug: string;
  name: string;
  title: string;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  isOnlineBookable: boolean;
  sortOrder: number;
  serviceIds: string[];
  updatedAt?: string;
}

export interface AdminCustomerSearchItem {
  id: string;
  fullName: string;
  phone: string;
  internalNote: string | null;
  recentBookings: Array<{
    id: string;
    status: AdminBookingStatus;
    visitStatus: AdminVisitStatus | null;
    startAt: string;
    professional: { name: string };
    items: Array<{ serviceName: string }>;
  }>;
}

export interface AdminCustomerDetail {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  internalNote: string | null;
  onlineBookingBlockedAt: string | null;
  onlineBookingBlockReason: string | null;
  createdAt: string;
  summary: {
    totalBookings: number;
    pastVisitTotal: number;
    noShowTotal: number;
    cancelledTotal: number;
    lastProfessionalName: string | null;
    lastServiceNames: string[];
  };
  futureBookings: AdminCustomerBooking[];
  pastBookings: AdminCustomerBooking[];
}

export interface AdminCustomerBooking {
  id: string;
  publicCode: string;
  status: AdminBookingStatus;
  source: AdminBookingSourceV2;
  visitStatus: AdminVisitStatus | null;
  startAt: string;
  endAt: string;
  totalPriceKurus: number;
  totalDurationMinutes: number;
  professional: { id: string; name: string; title: string };
  items: Array<{
    id: string;
    serviceId: string;
    serviceName: string;
    durationMinutes: number;
    priceKurus: number;
  }>;
}

export interface AdminBusinessHours {
  branch: { id: string; name: string; timezone: string };
  days: Array<{ weekday: number; intervals: AdminTimeInterval[] }>;
  overrides: Array<{
    id: string;
    date: string;
    isClosed: boolean;
    note: string | null;
    intervals: AdminTimeInterval[];
  }>;
}

export interface AdminAuditEvent {
  id: string;
  entityType: string;
  action: string;
  actorType: "ADMIN" | "CUSTOMER" | "SYSTEM";
  beforeData: unknown;
  afterData: unknown;
  reason: string | null;
  createdAt: string;
}

export interface AdminChangeRequest {
  id: string;
  bookingId: string;
  publicCode: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  bookingRevision: number;
  currentStartAt: string;
  currentEndAt: string;
  currentProfessional: { id: string; name: string };
  requestedStartAt: string;
  requestedEndAt: string;
  requestedProfessional: { id: string; name: string };
  customer: { fullName: string; phone: string };
  serviceNames: string[];
  reason: string | null;
  decisionReason: string | null;
  expiresAt: string;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWaitlistEntry {
  id: string;
  status: "ACTIVE" | "OFFERED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  fullName: string;
  phoneMasked: string;
  professional: { id: string; name: string } | null;
  services: Array<{ id: string; name: string; durationMinutes: number }>;
  dateFrom: string;
  dateTo: string;
  startMinute: number;
  endMinute: number;
  note: string | null;
  failedOfferCount: number;
  offers: Array<{
    id: string;
    status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | "FAILED";
    startAt: string;
    endAt: string;
    expiresAt: string;
    acceptedAt: string | null;
    professional: { id: string; name: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBookingPolicy {
  id: string;
  branchId: string;
  cancellationLeadMinutes: number;
  rescheduleLeadMinutes: number;
  changeRequestTtlMinutes: number;
  waitlistOfferTtlMinutes: number;
  maxActiveChangeRequests: number;
  otpResendSeconds: number;
  otpMaxAttempts: number;
  earlyArrivalMinutes: number;
  reminderLeadMinutes: number;
  pendingWarningMinutes: number;
  bookingWindowDays: number;
  /** 0 = ızgara adımı hizmet süresine eşitlenir. Pozitif değer sabit adımdır. */
  publicSlotGranularityMinutes: number;
  minimumBookingNoticeMinutes: number;
  sameDayBookingCutoffMinute: number | null;
  allowLateCancellation: boolean;
  waitlistEnabled: boolean;
  automaticWaitlistOffers: boolean;
  reviewRequestEnabled: boolean;
  reviewRequestDelayMinutes: number;
  reviewRequestExpiryDays: number;
  salonPhone: string | null;
  whatsappPhone: string | null;
  mapsUrl: string | null;
  googleReviewUrl: string | null;
  customerPolicyText: string | null;
  updatedAt: string;
}

export interface AdminBookingSearchResponse {
  items: AdminBooking[];
  nextCursor: string | null;
}

export interface AdminOperationsReport {
  range: { from: string; to: string };
  totals: {
    appointments: number;
    pending: number;
    confirmed: number;
    past: number;
    cancelled: number;
    noShow: number;
    waitlistWon: number;
    occupancyPercent: number;
    capacityMinutes: number;
    occupiedMinutes: number;
    averageApprovalMinutes: number | null;
    noShowRate: number;
    cancellationRate: number;
    recurringBookingRate: number;
    estimatedPastServiceValueKurus: number;
    plannedServiceValueKurus: number;
    averageRating: number;
    reviewResponseRate: number;
    reviewDistribution: Array<{ rating: number; count: number }>;
  };
  professionals: Array<{
    id: string;
    name: string;
    count: number;
    minutes: number;
    capacityMinutes: number;
    occupancyPercent: number;
  }>;
  services: Array<{ id: string; name: string; count: number }>;
  trend: Array<{ date: string; count: number }>;
}

export type AdminRole = "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";

export interface AdminIdentity {
  sessionId: string;
  userId: string;
  branchId: string;
  username: string;
  displayName: string;
  role: AdminRole;
  professionalId: string | null;
  expiresAt: string;
}

export interface AdminProfessionalServiceSetting {
  serviceId: string;
  serviceName: string;
  isAssigned: boolean;
  salonDurationMinutes: number;
  salonPriceKurus: number;
  salonOnlineBookable: boolean;
  durationMinutesOverride: number | null;
  priceKurusOverride: number | null;
  isOnlineBookableOverride: boolean | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  processingStartOffsetMinutes: number | null;
  processingDurationMinutes: number;
  effectiveDurationMinutes: number;
  effectivePriceKurus: number;
  effectiveOnlineBookable: boolean;
}

export interface AdminTeamAccess {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  professionalId: string | null;
  professional: { id: string; name: string } | null;
  isActive: boolean;
  lastLoginAt: string | null;
  activeSessionCount: number;
}

export interface AdminReview {
  id: string;
  publicCode: string;
  rating: number;
  comment: string | null;
  submittedAt: string;
  visitAt: string;
  professional: { id: string; name: string };
  services: string[];
  customer: { id: string | null; fullName: string };
  adminReadAt: string | null;
  adminNote: string | null;
}

export interface AdminReviewSummary {
  submitted: number;
  requested: number;
  unread: number;
  responseRate: number;
  averageRating: number;
  distribution: Array<{ rating: number; count: number }>;
  professionals: Array<{
    professionalId: string;
    professionalName: string;
    reviewCount: number;
    averageRating: number;
  }>;
}

export interface AdminActiveSession {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}
