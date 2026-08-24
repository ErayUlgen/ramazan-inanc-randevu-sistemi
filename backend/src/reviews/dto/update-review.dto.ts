import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsBoolean()
  markRead?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
