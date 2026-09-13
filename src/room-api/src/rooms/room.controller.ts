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
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { GuestSessionDto } from './dto/guest-session.dto';
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
}
