import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { Room } from './room.entity';
import { Membership } from './membership.entity';
import { Payment } from './payment.entity';
import { RoomMode, VALID_ROOM_MODES } from './room-mode.enum';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { GuestSessionDto } from './dto/guest-session.dto';
import { PayRoomDto } from './dto/pay-room.dto';
import { ExtendRoomDto } from './dto/extend-room.dto';
import { getPackage, calculateRetentionUntil } from './room-packages';

const GUEST_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
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

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createGuestSession(
    roomId: string,
    dto: GuestSessionDto,
    deviceId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    if (dto.acceptTerms !== true) {
      throw new BadRequestException('Terms must be accepted to join');
    }

    const room = await this.findOne(roomId);
    if (!room.inviteLink) {
      throw new BadRequestException(`Room ${roomId} has no active invite link`);
    }

    const blocked = await this.membershipRepo.findOneBy({
      roomId,
      deviceId,
      blocked: true,
    });
    if (blocked) {
      throw new BadRequestException('Device is blocked from this Room');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const sessionExpiry = new Date(Date.now() + GUEST_SESSION_TTL_MS);

    const membership = this.membershipRepo.create({
      roomId,
      deviceId,
      displayName: dto.displayName,
      role: 'Guest',
      tokenHash: this.hashToken(token),
      sessionExpiry,
      blocked: false,
    });
    await this.membershipRepo.save(membership);

    return { token, expiresAt: sessionExpiry };
  }

  async rotateLink(id: string) {
    const room = await this.findOne(id);

    const slug = this.generateSlug();
    room.inviteLink = `https://localhost/r/${slug}`;
    await this.roomRepo.save(room);

    await this.membershipRepo.update({ roomId: id }, { sessionExpiry: new Date() });

    return this.getEntryKit(id);
  }

  async pay(roomId: string, dto: PayRoomDto, ownerId: string): Promise<{ paymentId: string; retentionUntil: Date; room: Room }> {
    const room = await this.findOne(roomId);
    if (room.ownerId !== ownerId) {
      throw new ForbiddenException('Owner mismatch');
    }

    const packageConfig = getPackage(dto.package);
    const retentionUntil = calculateRetentionUntil(dto.package, dto.days);

    const payment = this.paymentRepo.create({
      roomId,
      package: dto.package,
      amount: null,
      period: null,
      providerRef: dto.providerRef ?? null,
      status: 'completed',
    });
    const savedPayment = await this.paymentRepo.save(payment);

    room.package = dto.package;
    room.retentionUntil = retentionUntil;
    room.paymentId = savedPayment.id;
    await this.roomRepo.save(room);

    return { paymentId: savedPayment.id, retentionUntil, room };
  }

  async extend(roomId: string, dto: ExtendRoomDto, ownerId: string): Promise<{ retentionUntil: Date; room: Room }> {
    const room = await this.findOne(roomId);
    if (room.ownerId !== ownerId) {
      throw new ForbiddenException('Owner mismatch');
    }

    const currentRetention = room.retentionUntil ?? new Date();
    const newRetention = new Date(currentRetention.getTime() + dto.days * 24 * 60 * 60 * 1000);

    const payment = this.paymentRepo.create({
      roomId,
      package: room.package ?? 'Basic',
      amount: null,
      period: `${dto.days}d extension`,
      providerRef: null,
      status: 'completed',
    });
    await this.paymentRepo.save(payment);

    room.retentionUntil = newRetention;
    await this.roomRepo.save(room);

    return { retentionUntil: newRetention, room };
  }
}
