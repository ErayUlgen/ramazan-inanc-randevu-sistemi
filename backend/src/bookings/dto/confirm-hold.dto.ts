import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ConfirmHoldDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsUUID()
  challengeId?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  verificationCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsString()
  holdToken!: string;
}
