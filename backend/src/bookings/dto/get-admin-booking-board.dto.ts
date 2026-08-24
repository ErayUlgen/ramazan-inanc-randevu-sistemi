import { IsString, Matches, MaxLength } from 'class-validator';

export class GetAdminBookingBoardDto {
  @IsString()
  @MaxLength(120)
  branchSlug!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}
