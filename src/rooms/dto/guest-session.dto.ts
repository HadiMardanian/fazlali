import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class GuestSessionDto {
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsBoolean()
  acceptTerms: boolean;
}