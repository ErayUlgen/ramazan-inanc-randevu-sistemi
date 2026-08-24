import {
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BookingSeriesFrequency } from '@prisma/client';

export class PreviewBookingSeriesDto {
  @IsUUID()
  professionalId!: string;

  @IsUUID()
  serviceId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @IsEnum(BookingSeriesFrequency)
  frequency!: BookingSeriesFrequency;

  @IsInt()
  @Min(2)
  @Max(12)
  occurrenceCount!: number;
}

export class CreateBookingSeriesDto extends PreviewBookingSeriesDto {
  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;
}

export class CreateAdminBookingSeriesDto extends CreateBookingSeriesDto {
  @IsString()
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MaxLength(30)
  phone!: string;
}
