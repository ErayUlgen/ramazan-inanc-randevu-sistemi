import { IsString, MaxLength, MinLength } from 'class-validator';

export class RequestBookingCodeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(24)
  phone!: string;

  @IsString()
  @MinLength(32)
  @MaxLength(128)
  holdToken!: string;
}
