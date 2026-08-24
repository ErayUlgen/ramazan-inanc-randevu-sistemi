import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  ValidateNested,
  Max,
  Min,
} from 'class-validator';

export class BusinessIntervalDto {
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number;
}

export class WeeklyBusinessDayDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => BusinessIntervalDto)
  intervals!: BusinessIntervalDto[];
}

export class UpdateBusinessHoursDto {
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WeeklyBusinessDayDto)
  days!: WeeklyBusinessDayDto[];
}
