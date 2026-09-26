import { IsString, IsOptional, IsEnum, IsInt, IsDateString, MinLength } from 'class-validator';
import { RoomMode } from '../room-mode.enum';

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  ownerId: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsInt()
  guestCapacity?: number;

  @IsOptional()
  @IsEnum(RoomMode, { message: `mode must be one of: Private, UploadOnly, Shared, Moderated` })
  mode?: RoomMode;

  @IsOptional()
  @IsString()
  package?: string;

  @IsOptional()
  @IsDateString()
  retentionUntil?: string;

  @IsOptional()
  @IsString()
  branding?: string;
}
