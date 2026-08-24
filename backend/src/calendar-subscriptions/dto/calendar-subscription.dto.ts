import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CalendarSubscriptionScope } from '@prisma/client';

export class CreateCalendarSubscriptionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  label!: string;

  @IsEnum(CalendarSubscriptionScope)
  scope!: CalendarSubscriptionScope;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
