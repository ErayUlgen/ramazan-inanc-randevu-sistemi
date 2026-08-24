import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class MarkNoShowDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
