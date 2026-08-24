import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertProfessionalDto {
  @IsUUID()
  branchId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  photoUrl?: string;

  @IsBoolean()
  isActive!: boolean;

  @IsBoolean()
  isOnlineBookable!: boolean;

  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  serviceIds!: string[];
}
