import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelScheduleBlockDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
