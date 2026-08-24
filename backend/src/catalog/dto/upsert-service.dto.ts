import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDivisibleBy,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertServiceDto {
  @IsUUID()
  branchId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  preVisitInstructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  postVisitInstructions?: string;

  @IsInt()
  @Min(5)
  @Max(480)
  @IsDivisibleBy(5)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceKurus!: number;

  @IsBoolean()
  isActive!: boolean;

  @IsBoolean()
  isOnlineBookable!: boolean;

  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  professionalIds?: string[];
}
