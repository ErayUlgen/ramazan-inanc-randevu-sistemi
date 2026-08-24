import { IsOptional, IsUUID, Matches } from 'class-validator';

export class GetBookingChangeAvailabilityDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;
}
