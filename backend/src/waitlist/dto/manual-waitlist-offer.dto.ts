import { IsUUID, Matches } from 'class-validator';

export class ManualWaitlistOfferDto {
  @IsUUID() professionalId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @Matches(/^\d{2}:\d{2}$/) startTime!: string;
}
