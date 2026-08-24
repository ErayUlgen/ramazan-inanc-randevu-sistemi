import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateHoldDto {
  @IsString()
  branchSlug!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1, {
    message: 'Online randevuda yalnızca bir hizmet seçilebilir.',
  })
  @IsUUID('4', { each: true })
  serviceIds!: string[];

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;
}
