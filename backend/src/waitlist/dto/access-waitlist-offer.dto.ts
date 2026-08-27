import { IsString, MaxLength, MinLength } from 'class-validator';

export class AccessWaitlistOfferDto {
  @IsString()
  @MinLength(32)
  @MaxLength(200)
  token!: string;
}
