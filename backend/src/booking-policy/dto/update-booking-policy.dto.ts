import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBookingPolicyDto {
  @IsInt() @Min(1) @Max(90) bookingWindowDays!: number;
  /** 0 = hizmet süresini ızgara adımı olarak kullan. 5–240 arası sabit değer de verilebilir. */
  @IsInt() @Min(0) @Max(240) publicSlotGranularityMinutes!: number;
  @IsInt() @Min(0) @Max(10080) minimumBookingNoticeMinutes!: number;
  @IsOptional() @IsInt() @Min(0) @Max(1439) sameDayBookingCutoffMinute?:
    number | null;
  @IsInt() @Min(0) @Max(10080) cancellationLeadMinutes!: number;
  @IsInt() @Min(0) @Max(10080) rescheduleLeadMinutes!: number;
  @IsInt() @Min(15) @Max(10080) changeRequestTtlMinutes!: number;
  @IsInt() @Min(5) @Max(1440) waitlistOfferTtlMinutes!: number;
  @IsInt() @Min(1) @Max(3) maxActiveChangeRequests!: number;
  @IsInt() @Min(30) @Max(600) otpResendSeconds!: number;
  @IsInt() @Min(3) @Max(10) otpMaxAttempts!: number;
  @IsInt() @Min(0) @Max(60) earlyArrivalMinutes!: number;
  @IsInt() @Min(5) @Max(1440) reminderLeadMinutes!: number;
  @IsInt() @Min(5) @Max(1440) pendingWarningMinutes!: number;
  @IsBoolean() allowLateCancellation!: boolean;
  @IsBoolean() waitlistEnabled!: boolean;
  @IsBoolean() automaticWaitlistOffers!: boolean;
  @IsBoolean() reviewRequestEnabled!: boolean;
  @IsInt() @Min(0) @Max(10080) reviewRequestDelayMinutes!: number;
  @IsInt() @Min(1) @Max(90) reviewRequestExpiryDays!: number;

  @IsOptional() @IsString() @MaxLength(30) salonPhone?: string;
  @IsOptional() @IsString() @MaxLength(30) whatsappPhone?: string;
  @IsOptional() @IsUrl() @MaxLength(500) mapsUrl?: string;
  @IsOptional() @IsUrl() @MaxLength(500) googleReviewUrl?: string;
  @IsOptional() @IsString() @MaxLength(1000) customerPolicyText?: string;
}
