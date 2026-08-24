export type CustomerBookingStatus =
  | "HOLD"
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type CustomerProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  smsNotificationsEnabled: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
};

export type CustomerSession = {
  authenticated: true;
  expiresAt: string;
  customer: CustomerProfile;
};

export type CustomerSessionState =
  | CustomerSession
  | { authenticated: false };

export type CustomerBookingSummary = {
  id: string;
  publicCode: string;
  status: CustomerBookingStatus;
  visitStatus:
    "SCHEDULED" | "ARRIVED" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW" | null;
  startAt: string;
  endAt: string;
  totalDurationMinutes: number;
  totalPriceKurus: number;
  revision: number;
  notificationsEnabled: boolean;
  seriesId: string | null;
  occurrenceIndex: number | null;
  isSeriesException: boolean;
  professional: { id: string; name: string; title: string };
  branch: {
    name: string;
    city: string;
    district: string | null;
  };
  items: Array<{
    id: string;
    serviceId: string;
    serviceName: string;
    durationMinutes: number;
    priceKurus: number;
    preVisitInstructions: string | null;
    postVisitInstructions: string | null;
  }>;
  activeChangeRequest: {
    id: string;
    status: string;
    requestedStartAt: string;
    requestedProfessionalName: string;
  } | null;
};

export type CustomerRebookSuggestion = {
  publicCode: string;
  service: { id: string; name: string } | null;
  previousServiceName: string;
  professional: { id: string; name: string } | null;
  targetStep: 1 | 3;
  message: string;
};

export type CustomerBookingDetail = CustomerBookingSummary & {
  customerNote: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  reviewAvailableAt: string;
  reviewEligible: boolean;
  reviewSubmitted: boolean;
  branch: CustomerBookingSummary["branch"] & {
    id: string;
    slug: string;
    address: string | null;
    timezone: string;
    arrivalLeadMinutes: number;
    reminderLeadMinutes: number;
  };
  notifications: Array<{
    id: string;
    eventType: string;
    status: string;
    scheduledFor: string;
    sentAt: string | null;
    createdAt: string;
  }>;
  changeRequests: Array<{
    id: string;
    status: string;
    requestedStartAt: string;
    requestedEndAt: string;
    requestedProfessional: { id: string; name: string };
    reason: string | null;
    decisionReason: string | null;
    expiresAt: string;
    decidedAt: string | null;
    createdAt: string;
  }>;
  canCancel: boolean;
  canRequestChange: boolean;
};

export type CustomerReview = {
  id: string;
  publicCode: string;
  rating: number | null;
  comment: string | null;
  submittedAt: string | null;
  expiresAt: string;
  availableAt: string;
  professional: { id: string; name: string };
  services: string[];
  visitAt: string;
};

export type BookingSeriesFrequency =
  "WEEKLY" | "BIWEEKLY" | "FOUR_WEEKLY" | "MONTHLY";

export type BookingSeriesPreview = {
  canCreate: boolean;
  occurrences: Array<{
    index: number;
    date: string;
    startTime: string;
    available: boolean;
    message: string | null;
  }>;
};

export type BookingChangeAvailability = {
  date: string;
  timezone: string;
  isClosed: boolean;
  totalDurationMinutes: number;
  slots: Array<{
    startTime: string;
    endTime: string;
    availableProfessionalIds: string[];
  }>;
  professionals: Array<{ id: string; name: string; title: string }>;
};

export type CustomerBookingForm = {
  id: string;
  status: "PENDING" | "SUBMITTED" | "REVIEWED";
  isRequired: boolean;
  answers: Record<string, unknown> | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  formTemplateVersion: {
    id: string;
    version: number;
    title: string;
    description: string | null;
    definition: {
      fields: Array<{
        key: string;
        label: string;
        type:
          | "SHORT_TEXT"
          | "LONG_TEXT"
          | "YES_NO"
          | "SINGLE_CHOICE"
          | "MULTI_CHOICE"
          | "DATE"
          | "INFORMATION"
          | "CHECKBOX";
        required?: boolean;
        options?: string[];
        consentType?: string;
      }>;
    };
    formTemplate: { id: string; name: string };
  };
};
