import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class GetAdminAvailabilityDto {
  @IsString()
  branchSlug!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  serviceIds!: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  excludeBookingId?: string;
}
