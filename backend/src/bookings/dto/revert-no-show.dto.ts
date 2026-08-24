import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class RevertNoShowDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
