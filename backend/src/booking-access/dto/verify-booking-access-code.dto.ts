import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class VerifyBookingAccessCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(32)
  referenceCode!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(24)
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
