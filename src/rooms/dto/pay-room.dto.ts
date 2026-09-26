import { IsIn, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { VALID_PACKAGES } from '../room-packages';

export class PayRoomDto {
  @IsIn(VALID_PACKAGES)
  package: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;

  @IsOptional()
  @IsString()
  providerRef?: string;
}
