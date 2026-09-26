import { IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class ListMediaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['temp', 'uploading', 'queued', 'processing', 'approved', 'rejected', 'blocked'])
  status?: string;
}
