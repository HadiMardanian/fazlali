import { IsInt, Min } from 'class-validator';

export class ExtendRoomDto {
  @IsInt()
  @Min(1)
  days: number;
}
