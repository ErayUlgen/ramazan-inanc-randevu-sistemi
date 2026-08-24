export type CustomerCareProfile = {
  id?: string;
  preferredProfessionalId: string | null;
  preferredServiceId: string | null;
  preferredProfessional?: { id: string; name: string; title: string } | null;
  preferredService?: { id: string; name: string } | null;
  stylePreferences: string | null;
  avoidProducts: string | null;
  customerReportedSensitivities: string | null;
  communicationNote: string | null;
  updatedAt?: string;
};

export type CustomerMemory = {
  customer: { id: string; fullName: string; phone: string };
  profile: CustomerCareProfile | null;
  tags: Array<{ id: string; name: string; color: string }>;
  summary: {
    pastVisitTotal: number;
    noShowTotal: number;
    cancelledTotal: number;
    estimatedServiceValueKurus: number;
    lastVisitAt: string | null;
    lastProfessional: { id: string; name: string } | null;
    lastServices: Array<{ serviceId: string; serviceName: string }>;
  };
  serviceRecords: CustomerServiceRecord[];
};

export type CustomerServiceRecord = {
  id: string;
  bookingId: string | null;
  serviceId: string | null;
  professionalId: string | null;
  technique: string | null;
  formulaNote: string | null;
  productNote: string | null;
  resultNote: string | null;
  nextVisitRecommendation: string | null;
  createdAt: string;
  professional: { id: string; name: string; title: string } | null;
  service: { id: string; name: string } | null;
  booking: { id: string; publicCode: string; startAt: string } | null;
  createdByAdminUser: { id: string; displayName: string } | null;
  revisions: Array<{
    id: string;
    revision: number;
    technique: string | null;
    formulaNote: string | null;
    productNote: string | null;
    resultNote: string | null;
    nextVisitRecommendation: string | null;
    createdAt: string;
    createdByAdminUser: { id: string; displayName: string } | null;
  }>;
};

export type FormFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "YES_NO"
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "DATE"
  | "INFORMATION"
  | "CHECKBOX";

export type FormField = {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  documentKey?: string;
  documentVersion?: string;
  consentType?: "NOTICE_VIEWED" | "OPERATIONAL_CONSENT" | "MARKETING_CONSENT";
};

export type AdminFormTemplate = {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
  versions: Array<{
    id: string;
    version: number;
    title: string;
    description: string | null;
    definition: { fields: FormField[] };
    publishedAt: string | null;
  }>;
  requirements: Array<{
    id: string;
    serviceId: string;
    isRequired: boolean;
    sortOrder: number;
    service: { id: string; name: string };
  }>;
};

export type AdminBookingFormSubmission = {
  id: string;
  status: "PENDING" | "SUBMITTED" | "REVIEWED";
  isRequired: boolean;
  answers: Record<string, unknown> | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  formTemplateVersion: {
    version: number;
    title: string;
    definition: { fields: FormField[] };
    formTemplate: { id: string; name: string };
  };
  reviewedByAdminUser: { id: string; displayName: string } | null;
};

export type NotificationRule = {
  id: string;
  eventType: string;
  channel: "SMS";
  leadMinutes: number | null;
  messageTemplate: string | null;
  bookingStatuses: string[] | null;
  isActive: boolean;
  sortOrder: number;
};

export type AdminNotificationItem = {
  id: string;
  eventType: string;
  channel: string;
  status: string;
  scheduledFor: string;
  attemptCount: number;
  maxAttempts: number;
  sentAt: string | null;
  failedAt: string | null;
  lastErrorMessage: string | null;
  canRetry: boolean;
  booking: {
    id: string;
    publicCode: string;
    customerNameSnapshot: string | null;
    startAt: string;
  } | null;
};

export type CalendarSubscription = {
  id: string;
  label: string;
  scope: "BRANCH" | "PROFESSIONAL";
  professionalId: string | null;
  professional: { id: string; name: string } | null;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: string;
  actorLabel: string | null;
  reason: string | null;
  beforeData: unknown;
  afterData: unknown;
  requestIpHash: string | null;
  createdAt: string;
  adminUser: { id: string; displayName: string; role: string } | null;
};
