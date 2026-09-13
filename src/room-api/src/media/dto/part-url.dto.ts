import { IsInt, Min } from 'class-validator';

export class PartUrlDto {
  @IsInt()
  @Min(1)
  partNumber: number;
}