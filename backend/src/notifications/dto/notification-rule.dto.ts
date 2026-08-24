import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BookingStatus,
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from '@prisma/client';

export class UpsertNotificationRuleDto {
  @IsEnum(NotificationEventType)
  eventType!: NotificationEventType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(43_200)
  leadMinutes?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(480)
  messageTemplate?: string | null;

  @IsArray()
  @IsEnum(BookingStatus, { each: true })
  bookingStatuses!: BookingStatus[];

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class ListNotificationsDto {
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsEnum(NotificationEventType)
  eventType?: NotificationEventType;

  @IsOptional()
  @IsString()
  cursor?: string;
}
