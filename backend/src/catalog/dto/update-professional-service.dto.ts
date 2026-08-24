import {
  IsBoolean,
  IsDivisibleBy,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateProfessionalServiceDto {
  @IsBoolean()
  isAssigned!: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  @IsDivisibleBy(5)
  durationMinutesOverride?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceKurusOverride?: number | null;

  @IsOptional()
  @IsBoolean()
  isOnlineBookableOverride?: boolean | null;

  @IsInt()
  @Min(0)
  @Max(240)
  @IsDivisibleBy(5)
  bufferBeforeMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(240)
  @IsDivisibleBy(5)
  bufferAfterMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  @IsDivisibleBy(5)
  processingStartOffsetMinutes?: number | null;

  @IsInt()
  @Min(0)
  @Max(480)
  @IsDivisibleBy(5)
  processingDurationMinutes!: number;
}
