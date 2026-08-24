import { ScheduleBlockKind } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateScheduleBlockDto {
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsEnum(ScheduleBlockKind)
  kind!: ScheduleBlockKind;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNote?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;
}
