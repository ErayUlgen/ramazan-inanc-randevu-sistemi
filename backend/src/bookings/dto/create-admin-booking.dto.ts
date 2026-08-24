import { BookingSource } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAdminBookingDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  branchSlug!: string;

  @IsEnum(BookingSource)
  source!: BookingSource;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  serviceIds!: string[];

  @IsUUID()
  professionalId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;

  @IsBoolean()
  notificationsEnabled!: boolean;
}
