import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  accessKey?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  password?: string;
}
