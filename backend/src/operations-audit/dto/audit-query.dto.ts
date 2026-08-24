import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AuditQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  adminUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export class ExportQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsIn(['bookings', 'customers', 'services', 'professionals', 'notifications'])
  type!:
    'bookings' | 'customers' | 'services' | 'professionals' | 'notifications';
}
