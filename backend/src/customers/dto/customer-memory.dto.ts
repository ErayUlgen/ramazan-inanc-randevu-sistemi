import {
  ArrayMaxSize,
  IsArray,
  IsHexColor,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCustomerCareProfileDto {
  @IsOptional()
  @IsUUID()
  preferredProfessionalId?: string | null;

  @IsOptional()
  @IsUUID()
  preferredServiceId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  stylePreferences?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  avoidProducts?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  customerReportedSensitivities?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  communicationNote?: string;
}

export class CreateCustomerTagDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class SetCustomerTagsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  tagIds!: string[];
}

export class CreateCustomerServiceRecordDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  technique?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  formulaNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  productNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  resultNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  nextVisitRecommendation?: string;
}

export class ReviseCustomerServiceRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  technique?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  formulaNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  productNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  resultNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  nextVisitRecommendation?: string;
}

export class MergeCustomerDto {
  @IsUUID()
  sourceCustomerId!: string;
}
