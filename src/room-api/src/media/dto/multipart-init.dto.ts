import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { MAX_FILE_SIZE_BYTES } from './init-upload.dto';

export class MultipartInitDto {
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

  @IsInt()
  @Min(1)
  @Max(10000)
  totalParts: number;
}