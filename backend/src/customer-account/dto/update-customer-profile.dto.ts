import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCustomerProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string | null;

  @IsBoolean()
  smsNotificationsEnabled!: boolean;
}
