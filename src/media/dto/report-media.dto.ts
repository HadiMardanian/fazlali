import { IsString, MinLength } from 'class-validator';

export class ReportMediaDto {
  @IsString()
  @MinLength(10)
  reason: string;
}
