import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BusinessIntervalDto } from './update-business-hours.dto';

export class UpsertDateOverrideDto {
  @IsBoolean()
  isClosed!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => BusinessIntervalDto)
  intervals!: BusinessIntervalDto[];
}
