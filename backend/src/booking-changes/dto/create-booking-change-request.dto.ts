import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingChangeRequestDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @IsUUID()
  professionalId!: string;

  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
