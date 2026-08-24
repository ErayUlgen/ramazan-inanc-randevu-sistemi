import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';

export class RescheduleBookingDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  serviceIds!: string[];

  @IsUUID()
  professionalId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @IsOptional()
  @IsBoolean()
  allowOverride?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  overrideReason?: string;
}
