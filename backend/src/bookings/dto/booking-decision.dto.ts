import {
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum BookingDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class BookingDecisionDto {
  @IsEnum(BookingDecision)
  decision!: BookingDecision;

  @ValidateIf(
    (dto: BookingDecisionDto) => dto.decision === BookingDecision.REJECT,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason?: string;
}
