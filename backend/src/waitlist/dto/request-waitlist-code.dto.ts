import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class RequestWaitlistCodeDto {
  @IsString() @MaxLength(120) branchSlug!: string;
  @IsString() @MaxLength(120) fullName!: string;
  @IsString() @MaxLength(30) phone!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsUUID('4', { each: true })
  serviceIds!: string[];

  @IsOptional() @IsUUID() professionalId?: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo!: string;
  @Matches(/^\d{2}:\d{2}$/) startTime!: string;
  @Matches(/^\d{2}:\d{2}$/) endTime!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
