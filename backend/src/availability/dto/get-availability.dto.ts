import { IsOptional, IsString, Matches } from 'class-validator';

export class GetAvailabilityDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  serviceIds!: string;

  @IsOptional()
  @IsString()
  professionalId?: string;
}
