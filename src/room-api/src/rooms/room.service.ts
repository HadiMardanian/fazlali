import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { Room } from './room.entity';
import { RoomMode, VALID_ROOM_MODES } from './room-mode.enum';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
  ) {}

  private generateSlug(): string {
    return crypto.randomBytes(7).toString('base64url').slice(0, 10);
  }

  async create(dto: CreateRoomDto): Promise<Room> {
    if (dto.mode && !VALID_ROOM_MODES.includes(dto.mode)) {
      throw new BadRequestException(
        `Invalid mode: ${dto.mode}. Must be one of: ${VALID_ROOM_MODES.join(', ')}`,
      );
    }

    const room = this.roomRepo.create({
      ...dto,
      eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
      retentionUntil: dto.retentionUntil ? new Date(dto.retentionUntil) : null,
      mode: dto.mode || RoomMode.PRIVATE,
    });

    const saved = await this.roomRepo.save(room);

    const slug = this.generateSlug();
    saved.inviteLink = `https://localhost/r/${slug}`;
    return this.roomRepo.save(saved);
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomRepo.findOneBy({ id });
    if (!room) {
      throw new NotFoundException(`Room ${id} not found`);
    }
    return room;
  }

  async update(id: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(id);

    if (dto.mode && !VALID_ROOM_MODES.includes(dto.mode)) {
      throw new BadRequestException(
        `Invalid mode: ${dto.mode}. Must be one of: ${VALID_ROOM_MODES.join(', ')}`,
      );
    }

    Object.assign(room, {
      ...dto,
      eventDate: dto.eventDate ? new Date(dto.eventDate) : room.eventDate,
      retentionUntil: dto.retentionUntil ? new Date(dto.retentionUntil) : room.retentionUntil,
    });

    return this.roomRepo.save(room);
  }

  async remove(id: string): Promise<void> {
    const room = await this.findOne(id);
    await this.roomRepo.remove(room);
  }

  async getEntryKit(id: string) {
    const room = await this.findOne(id);

    const qr = await QRCode.toDataURL(room.inviteLink!);

    return {
      qr,
      link: room.inviteLink,
      posterPayload: {
        title: room.title,
        eventDate: room.eventDate,
        link: room.inviteLink,
        instructions: 'Scan QR or open link to join',
      },
    };
  }

  async rotateLink(id: string) {
    const room = await this.findOne(id);

    const slug = this.generateSlug();
    room.inviteLink = `https://localhost/r/${slug}`;
    await this.roomRepo.save(room);

    return this.getEntryKit(id);
  }
}
