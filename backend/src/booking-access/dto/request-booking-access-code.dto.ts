import { IsString, MaxLength, MinLength } from 'class-validator';

export class RequestBookingAccessCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(32)
  referenceCode!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(24)
  phone!: string;
}
