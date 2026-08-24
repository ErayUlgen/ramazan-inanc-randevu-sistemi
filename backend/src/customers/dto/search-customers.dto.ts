import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SearchCustomersDto {
  @IsString()
  @MinLength(2)
  query!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}
