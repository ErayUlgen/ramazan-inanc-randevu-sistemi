import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum CustomerBookingView {
  PENDING = 'pending',
  UPCOMING = 'upcoming',
  HISTORY = 'history',
}

export class ListCustomerBookingsDto {
  @IsOptional()
  @IsEnum(CustomerBookingView)
  view: CustomerBookingView = CustomerBookingView.UPCOMING;

  @IsOptional()
  @IsString()
  @IsUUID()
  cursor?: string;
}
