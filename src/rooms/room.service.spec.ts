import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RoomService } from './room.service';
import { Room } from './room.entity';
import { Membership } from './membership.entity';
import { Payment } from './payment.entity';
import { Media } from '../media/media.entity';
import { RoomMode } from './room-mode.enum';
import { RetentionService } from './retention.service';
import { AuditService } from '../audit/audit.service';

describe('RoomService', () => {
  let service: RoomService;
  let roomRepo: Record<string, jest.Mock>;
  let membershipRepo: Record<string, jest.Mock>;
  let paymentRepo: Record<string, jest.Mock>;
  let mediaRepo: Record<string, jest.Mock>;
  let retentionService: Partial<RetentionService>;
  let auditService: Partial<AuditService>;

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
    paymentId: null,
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
      count: jest.fn().mockResolvedValue(0),
      query: jest.fn(),
    };
    paymentRepo = {
      create: jest.fn().mockImplementation((p: Partial<Payment>) => ({ ...p, id: 'pay-1' } as Payment)),
      save: jest.fn().mockImplementation((p: Payment) => Promise.resolve(p)),
    };
    mediaRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(0),
      query: jest.fn().mockResolvedValue([{ volume: 0 }]),
    };
    retentionService = {
      scheduleRetention: jest.fn().mockResolvedValue({ policyId: 'policy-1' }),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    service = new RoomService(
      roomRepo as any,
      membershipRepo as any,
      paymentRepo as any,
      mediaRepo as any,
      retentionService as any,
      auditService as any,
    );
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

  describe('pay', () => {
    it('sets package + retentionUntil and creates Payment record', async () => {
      const result = await service.pay(room.id, { package: 'Wedding', days: 30 }, 'owner-1');

      expect(result.retentionUntil).toBeInstanceOf(Date);
      expect(result.retentionUntil.getTime() - Date.now()).toBeGreaterThanOrEqual(29 * 24 * 60 * 60 * 1000);
      expect(result.retentionUntil.getTime() - Date.now()).toBeLessThanOrEqual(31 * 24 * 60 * 60 * 1000);
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ package: 'Wedding', status: 'completed' }),
      );
      expect(roomRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ package: 'Wedding', retentionUntil: expect.any(Date), paymentId: expect.any(String) }),
      );
    });

    it('throws BadRequestException for invalid package', async () => {
      await expect(service.pay(room.id, { package: 'Invalid' }, 'owner-1'))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ForbiddenException for wrong ownerId', async () => {
      await expect(service.pay(room.id, { package: 'Basic' }, 'wrong-owner'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException for unknown room', async () => {
      roomRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.pay(room.id, { package: 'Basic' }, 'owner-1'))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('extend', () => {
    it('adds days to retentionUntil and creates Payment', async () => {
      const initialRetention = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const extendedRoom = { ...room, retentionUntil: initialRetention };
      roomRepo.findOneBy.mockResolvedValue(extendedRoom);

      const result = await service.extend(room.id, { days: 14 }, 'owner-1');

      expect(result.retentionUntil.getTime() - initialRetention.getTime()).toBeCloseTo(14 * 24 * 60 * 60 * 1000, -5);
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ period: '14d extension' }),
      );
    });

    it('throws NotFoundException for unknown room', async () => {
      roomRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.extend(room.id, { days: 7 }, 'owner-1'))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException for wrong ownerId', async () => {
      await expect(service.extend(room.id, { days: 7 }, 'wrong-owner'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('blockMembership', () => {
    it('sets blocked=true and logs audit', async () => {
      const membership = { id: 'm1', roomId: room.id, blocked: false } as Membership;
      membershipRepo.findOneBy.mockResolvedValueOnce(membership);

      await service.blockMembership(room.id, 'owner-1', 'm1');

      expect(membershipRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ blocked: true }),
      );
      expect(auditService.log).toHaveBeenCalledWith(room.id, 'owner-1', 'block', 'm1');
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(service.blockMembership(room.id, 'wrong-owner', 'm1'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException for unknown membership', async () => {
      membershipRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.blockMembership(room.id, 'owner-1', 'unknown-member'))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('unblockMembership', () => {
    it('sets blocked=false and logs audit', async () => {
      const membership = { id: 'm1', roomId: room.id, blocked: true } as Membership;
      membershipRepo.findOneBy.mockResolvedValueOnce(membership);

      await service.unblockMembership(room.id, 'owner-1', 'm1');

      expect(membershipRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ blocked: false }),
      );
      expect(auditService.log).toHaveBeenCalledWith(room.id, 'owner-1', 'block', 'm1');
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(service.unblockMembership(room.id, 'wrong-owner', 'm1'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getStats', () => {
    it('returns joined, uploaders, files, volume, and history', async () => {
      membershipRepo.count.mockResolvedValueOnce(5);
      
      // First call to mediaRepo.query for volume aggregates
      mediaRepo.query.mockResolvedValueOnce([{ uploaders: 3, files: 10, volume: 50000 }]);
      
      // Second call to membershipRepo.query for join history
      membershipRepo.query.mockResolvedValueOnce([{ date: '2026-09-26', joins: 5 }]);
      
      // Third call to mediaRepo.query for upload history
      mediaRepo.query.mockResolvedValueOnce([{ date: '2026-09-26', uploads: 10 }]);

      const result = await service.getStats(room.id, 'owner-1');

      expect(result.joined).toBe(5);
      expect(result.uploaders).toBe(3);
      expect(result.files).toBe(10);
      expect(result.volume).toBe(50000);
      expect(result.history).toHaveLength(1);
      expect(result.history[0]).toEqual({ date: '2026-09-26', joins: 5, uploads: 10 });
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(service.getStats(room.id, 'wrong-owner'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
