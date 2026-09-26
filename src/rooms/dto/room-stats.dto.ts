import { ApiProperty } from '@nestjs/swagger';

export class DailyStatDto {
  @ApiProperty({ description: 'The date string in YYYY-MM-DD format', example: '2026-09-26' })
  date: string;

  @ApiProperty({ description: 'Number of guests joined on this day', example: 12 })
  joins: number;

  @ApiProperty({ description: 'Number of files uploaded on this day', example: 45 })
  uploads: number;
}

export class RoomStatsDto {
  @ApiProperty({ description: 'Total number of active joined guests' })
  joined: number;

  @ApiProperty({ description: 'Total number of unique uploaders' })
  uploaders: number;

  @ApiProperty({ description: 'Total number of approved files' })
  files: number;

  @ApiProperty({ description: 'Total storage volume used in bytes' })
  volume: number;

  @ApiProperty({ type: [DailyStatDto], description: 'Daily breakdown of join and upload rates' })
  history: DailyStatDto[];
}
