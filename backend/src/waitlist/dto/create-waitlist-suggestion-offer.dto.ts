import { IsUUID } from 'class-validator';

export class CreateWaitlistSuggestionOfferDto {
  @IsUUID() entryId!: string;
}
