import {
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class VerifyCustomerCodeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(24)
  phone!: string;

  @IsUUID()
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
