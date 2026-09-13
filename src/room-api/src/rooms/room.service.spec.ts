import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RoomService } from './room.service';
import { Room } from './room.entity';
import { Membership } from './membership.entity';
import { RoomMode } from './room-mode.enum';

describe('RoomService', () => {
  let service: RoomService;
  let roomRepo: Record<string, jest.Mock>;
  let membershipRepo: Record<string, jest.Mock>;

  const room: Room = {
    id: 'b4b3c9a8-0000-4000-8000-000000000001',
    ownerId: 'owner-1',
    title: 'Wedding',
    eventDate: null,
    guestCapacity: null,
    mode: RoomMode.PRIVATE,
    package: null,
    retentionUntil: null,
    status: 'active',
    inviteLink: 'https://localhost/r/aaaaaaaaaa',
    pinHash: null,
    branding: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    roomRepo = {
      findOneBy: jest.fn().mockResolvedValue(room),
      save: jest.fn().mockImplementation((r: Room) => Promise.resolve(r)),
      create: jest.fn().mockImplementation((r: Partial<Room>) => r as Room),
    };
    membershipRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockImplementation((m: Partial<Membership>) => m as Membership),
      save: jest.fn().mockImplementation((m: Membership) => Promise.resolve(m)),
    };
    service = new RoomService(roomRepo as any, membershipRepo as any);
  });

  describe('createGuestSession', () => {
    it('returns token + expiresAt ~24h and stores sha256 tokenHash', async () => {
      const result = await service.createGuestSession(
        room.id,
        { displayName: 'Sara', acceptTerms: true },
        'device-1',
      );

      expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      const ttl = result.expiresAt.getTime() - Date.now();
      expect(ttl).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(ttl).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);

      expect(membershipRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: room.id,
          deviceId: 'device-1',
          displayName: 'Sara',
          role: 'Guest',
          blocked: false,
        }),
      );
      const saved = (membershipRepo.save as jest.Mock).mock.calls[0][0] as Membership;
      expect(saved.tokenHash).toBe(
        crypto.createHash('sha256').update(result.token).digest('hex'),
      );
    });

    it('rejects when terms not accepted', async () => {
      await expect(
        service.createGuestSession(room.id, { displayName: 'Sara', acceptTerms: false }, 'device-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects unknown room with 404', async () => {
      roomRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(
        service.createGuestSession(room.id, { displayName: 'Sara', acceptTerms: true }, 'device-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects blocked device', async () => {
      membershipRepo.findOneBy.mockResolvedValueOnce({ id: 'm1', blocked: true } as Membership);
      await expect(
        service.createGuestSession(room.id, { displayName: 'Sara', acceptTerms: true }, 'device-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects room without active invite link', async () => {
      roomRepo.findOneBy.mockResolvedValueOnce({ ...room, inviteLink: null });
      await expect(
        service.createGuestSession(room.id, { displayName: 'Sara', acceptTerms: true }, 'device-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('rotateLink', () => {
    it('changes slug and revokes memberships', async () => {
      await service.rotateLink(room.id);

      expect(roomRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ inviteLink: expect.stringMatching(/^https:\/\/localhost\/r\/[a-zA-Z0-9_-]{10}$/) }),
      );
      expect(membershipRepo.update).toHaveBeenCalledWith(
        { roomId: room.id },
        { sessionExpiry: expect.any(Date) },
      );
    });
  });
});