import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AdminRole } from '@prisma/client';

export class CreateTeamAccessDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  username!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;

  @IsOptional()
  @IsUUID()
  professionalId?: string | null;
}
