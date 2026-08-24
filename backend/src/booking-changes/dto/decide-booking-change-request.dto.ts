import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideBookingChangeRequestDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
