import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class GetAdminWeekBoardDto {
  @IsString()
  @MaxLength(120)
  branchSlug!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;
}
