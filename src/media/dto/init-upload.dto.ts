import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export const VALID_MEDIA_KINDS = ['photo', 'video'] as const;
export const MAX_FILE_SIZE_BYTES = 512 * 1024 * 1024;

export class InitUploadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE_BYTES)
  size: number;

  @IsString()
  @IsNotEmpty()
  mime: string;

  @IsString()
  @IsNotEmpty()
  kind: 'photo' | 'video';
}