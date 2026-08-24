export interface SalonService {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceKurus: number;
  durationRange?: { min: number; max: number };
  priceRange?: { min: number; max: number };
  variesByProfessional?: boolean;
  preVisitInstructions?: string | null;
  postVisitInstructions?: string | null;
}

export interface Professional {
  id: string;
  slug: string;
  name: string;
  title: string;
  serviceIds: string[];
  serviceConfigurations?: Array<{
    serviceId: string;
    durationMinutesOverride: number | null;
    priceKurusOverride: number | null;
    isOnlineBookableOverride: boolean | null;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    processingStartOffsetMinutes: number | null;
    processingDurationMinutes: number;
  }>;
}

export interface BranchCatalog {
  id: string;
  slug: string;
  name: string;
  city: string;
  district?: string | null;
  address?: string | null;
  timezone: string;
  openingTime: string;
  closingTime: string;
  arrivalLeadMinutes: number;
  reminderLeadMinutes: number;
  requiresBookingApproval: boolean;
  services: SalonService[];
  professionals: Professional[];
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  availableProfessionalIds: string[];
  professionalOptions?: Array<{
    professionalId: string;
    durationMinutes: number;
    priceKurus: number;
    endTime: string;
  }>;
}

export interface AvailabilityResponse {
  date: string;
  timezone: string;
  totalDurationMinutes: number;
  totalPriceKurus: number;
  durationRange?: { min: number; max: number };
  priceRange?: { min: number; max: number };
  professionals?: Array<{
    id: string;
    name: string;
    title: string;
    totalDurationMinutes: number;
    totalPriceKurus: number;
  }>;
  slots: AvailabilitySlot[];
}

export interface PublicBookingPolicy {
  bookingWindowDays: number;
  minimumBookingNoticeMinutes: number;
  sameDayBookingCutoffMinute: number | null;
  waitlistEnabled: boolean;
  salonPhone: string | null;
  whatsappPhone: string | null;
  mapsUrl: string | null;
}

export interface BookingHold {
  id: string;
  publicCode: string;
  holdToken: string;
  holdExpiresAt: string;
  startAt?: string;
  endAt?: string;
  totalDurationMinutes?: number;
  totalPriceKurus?: number;
  professional?: Professional;
}
