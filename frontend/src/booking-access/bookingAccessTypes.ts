export type BookingAccessStatus =
  | "HOLD"
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type BookingNotificationStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "DELIVERED"
  | "RETRY_SCHEDULED"
  | "FAILED"
  | "SKIPPED";

export interface BookingAccessData {
  publicCode: string;
  status: BookingAccessStatus;
  startAt: string;
  endAt: string;
  totalDurationMinutes: number;
  totalPriceKurus: number;
  customer: { fullName: string; phoneMasked: string };
  professional: { id: string; name: string; title: string };
  branch: {
    id: string;
    slug: string;
    name: string;
    city: string;
    district: string | null;
    address: string | null;
    timezone: string;
    arrivalLeadMinutes: number;
    reminderLeadMinutes: number;
  };
  items: Array<{
    id: string;
    serviceName: string;
    durationMinutes: number;
    priceKurus: number;
  }>;
  notifications: Array<{
    id: string;
    eventType:
      | "BOOKING_RECEIVED"
      | "BOOKING_APPROVED"
      | "BOOKING_REJECTED"
      | "BOOKING_CANCELLED"
      | "BOOKING_REMINDER"
      | "CHANGE_REQUEST_RECEIVED"
      | "CHANGE_REQUEST_APPROVED"
      | "CHANGE_REQUEST_REJECTED";
    channel: "SMS";
    status: BookingNotificationStatus;
    scheduledFor: string;
    sentAt: string | null;
    createdAt: string;
  }>;
  changeRequests: Array<{
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";
    requestedStartAt: string;
    requestedEndAt: string;
    requestedProfessional: { id: string; name: string };
    reason: string | null;
    decisionReason: string | null;
    expiresAt: string;
    decidedAt: string | null;
    createdAt: string;
  }>;
  revision: number;
  canCancel: boolean;
  canRequestChange: boolean;
}

export interface BookingChangeAvailability {
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
}

export interface PublicBookingPolicy {
  cancellationLeadMinutes: number;
  rescheduleLeadMinutes: number;
  salonPhone: string | null;
  whatsappPhone: string | null;
  mapsUrl: string | null;
  customerPolicyText: string | null;
}
