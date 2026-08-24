import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ConsentRecordType } from '@prisma/client';

export class FormFieldDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label!: string;

  @IsIn([
    'SHORT_TEXT',
    'LONG_TEXT',
    'YES_NO',
    'SINGLE_CHOICE',
    'MULTI_CHOICE',
    'DATE',
    'INFORMATION',
    'CHECKBOX',
  ])
  type!:
    | 'SHORT_TEXT'
    | 'LONG_TEXT'
    | 'YES_NO'
    | 'SINGLE_CHOICE'
    | 'MULTI_CHOICE'
    | 'DATE'
    | 'INFORMATION'
    | 'CHECKBOX';

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  documentVersion?: string;

  @IsOptional()
  @IsEnum(ConsentRecordType)
  consentType?: ConsentRecordType;
}

export class CreateFormTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields?: FormFieldDto[];
}

export class UpdateFormDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields!: FormFieldDto[];
}

export class ServiceFormRequirementDto {
  @IsUUID()
  serviceId!: string;

  @IsBoolean()
  isRequired!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class SetFormRequirementsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ServiceFormRequirementDto)
  requirements!: ServiceFormRequirementDto[];
}

export class SubmitBookingFormDto {
  @IsObject()
  answers!: Record<string, unknown>;
}

export class ReviewBookingFormDto {
  @IsBoolean()
  reviewed!: boolean;
}
