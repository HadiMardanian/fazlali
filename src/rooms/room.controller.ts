import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { GuestSessionDto } from './dto/guest-session.dto';
import { PayRoomDto } from './dto/pay-room.dto';
import { ExtendRoomDto } from './dto/extend-room.dto';
import { RoomStatsDto } from './dto/room-stats.dto';
import { Room } from './room.entity';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  create(@Body() dto: CreateRoomDto): Promise<Room> {
    return this.roomService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Room> {
    return this.roomService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ): Promise<Room> {
    return this.roomService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.roomService.remove(id);
  }

  @Get(':id/entry-kit')
  getEntryKit(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomService.getEntryKit(id);
  }

  @Post(':id/rotate-link')
  rotateLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomService.rotateLink(id);
  }

  @Post(':id/guest-session')
  createGuestSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuestSessionDto,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.roomService.createGuestSession(id, dto, deviceId || 'unknown');
  }

  @Post(':id/pay')
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayRoomDto,
    @Headers('x-owner-id') ownerId?: string,
  ) {
    return this.roomService.pay(id, dto, ownerId || '');
  }

  @Post(':id/extend')
  extend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendRoomDto,
    @Headers('x-owner-id') ownerId?: string,
  ) {
    return this.roomService.extend(id, dto, ownerId || '');
  }

  @Post(':id/memberships/:memberId/block')
  blockMembership(
    @Param('id', ParseUUIDPipe) roomId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Headers('x-owner-id') ownerId?: string,
    @Body('reason') reason?: string,
  ) {
    if (!ownerId) throw new BadRequestException('Owner ID required');
    return this.roomService.blockMembership(roomId, ownerId, memberId, reason);
  }

  @Post(':id/memberships/:memberId/unblock')
  unblockMembership(
    @Param('id', ParseUUIDPipe) roomId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Headers('x-owner-id') ownerId?: string,
  ) {
    if (!ownerId) throw new BadRequestException('Owner ID required');
    return this.roomService.unblockMembership(roomId, ownerId, memberId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get room statistics' })
  @ApiResponse({ status: 200, description: 'Room stats retrieved successfully', type: RoomStatsDto })
  getStats(
    @Param('id', ParseUUIDPipe) roomId: string,
    @Headers('x-owner-id') ownerId?: string,
  ): Promise<RoomStatsDto> {
    if (!ownerId) throw new BadRequestException('Owner ID required');
    return this.roomService.getStats(roomId, ownerId);
  }
}
