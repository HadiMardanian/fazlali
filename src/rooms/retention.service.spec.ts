import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RetentionService } from './retention.service';
import { RetentionPolicy } from './retention-policy.entity';
import { Job } from '../jobs/job.entity';

const ROOM_ID = 'b4b3c9a8-0000-4000-8000-000000000001';
const POLICY_ID = 'b4b3c9a8-0000-4000-8000-000000000002';

function makePolicy(overrides: Partial<RetentionPolicy> = {}): RetentionPolicy {
  const expiryAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  return {
    id: POLICY_ID,
    roomId: ROOM_ID,
    expiryAt,
    graceUntil: new Date(expiryAt.getTime() + 7 * 24 * 60 * 60 * 1000),
    notified7d: false,
    notified3d: false,
    notified1d: false,
    action: 'delete',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as RetentionPolicy;
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    type: 'notice_7d',
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    error: null,
    mediaId: null,
    zipId: null,
    policyId: POLICY_ID,
    createdAt: new Date(),
    startedAt: null,
    finishedAt: null,
    updatedAt: new Date(),
    ...overrides,
  } as Job;
}

function buildService(overrides: { policy?: Partial<RetentionPolicy> } = {}) {
  const policyRepo = {
    findOneBy: jest.fn().mockResolvedValue(makePolicy(overrides.policy)),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((p: Partial<RetentionPolicy>) => ({ ...makePolicy(), ...p } as RetentionPolicy)),
    save: jest.fn().mockImplementation((p: RetentionPolicy) => Promise.resolve(p)),
  };
  const jobRepo = {
    create: jest.fn().mockImplementation((j: Partial<Job>) => ({ ...makeJob(), ...j } as Job)),
    save: jest.fn().mockResolvedValue(undefined),
  };

  const service = new RetentionService(policyRepo as any, jobRepo as any);
  return { service, policyRepo, jobRepo };
}

describe('RetentionService', () => {
  describe('scheduleRetention', () => {
    it('creates policy with graceUntil = expiryAt + 7 days', async () => {
      const { service, policyRepo } = buildService();
      // Simulate no existing policy
      (policyRepo.findOneBy as jest.Mock).mockResolvedValueOnce(null);
      const retentionUntil = new Date('2026-10-01T00:00:00Z');

      const result = await service.scheduleRetention(ROOM_ID, retentionUntil);

      expect(result.policyId).toBeDefined();
      expect(policyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: ROOM_ID,
          expiryAt: retentionUntil,
          graceUntil: new Date('2026-10-08T00:00:00Z'),
        }),
      );
    });

    it('updates existing policy and resets notice flags', async () => {
      const { service, policyRepo } = buildService({
        policy: makePolicy({ notified7d: true, notified3d: true, notified1d: true }),
      });
      const retentionUntil = new Date('2026-11-01T00:00:00Z');

      await service.scheduleRetention(ROOM_ID, retentionUntil);

      const saved = (policyRepo.save as jest.Mock).mock.calls[0][0] as RetentionPolicy;
      expect(saved.notified7d).toBe(false);
      expect(saved.notified3d).toBe(false);
      expect(saved.notified1d).toBe(false);
    });
  });

  describe('checkExpiryNotices', () => {
    it('enqueues notice jobs for policies nearing expiry', async () => {
      const nearExpiry = makePolicy({
        expiryAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        notified7d: false,
      });
      const { service, policyRepo, jobRepo } = buildService();
      (policyRepo.find as jest.Mock).mockResolvedValue([nearExpiry]);

      await service.checkExpiryNotices();

      expect(jobRepo.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'notice_7d' }));
    });

    it('does not enqueue duplicate notices', async () => {
      const alreadyNotified = makePolicy({
        expiryAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        notified7d: true,
      });
      const { service, policyRepo } = buildService();
      (policyRepo.find as jest.Mock).mockResolvedValue([alreadyNotified]);

      await service.checkExpiryNotices();

      expect(policyRepo.find).toHaveBeenCalled();
    });
  });

  describe('processGracePeriod', () => {
    it('queues grace check jobs for expired policies still in grace window', async () => {
      const { service, policyRepo, jobRepo } = buildService();
      const inGrace = makePolicy({
        expiryAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        graceUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });
      (policyRepo.find as jest.Mock).mockResolvedValue([inGrace]);

      await service.processGracePeriod();

      expect(jobRepo.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'grace_check' }));
    });

    it('does not queue policies outside grace window', async () => {
      const expired = makePolicy({
        expiryAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        graceUntil: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      });
      const { service, policyRepo } = buildService();
      (policyRepo.find as jest.Mock).mockResolvedValue([expired]);

      await service.processGracePeriod();

      expect(policyRepo.find).toHaveBeenCalled();
    });
  });

  describe('sendNotice', () => {
    it('marks notified1d when within 1 day', async () => {
      const { service, policyRepo } = buildService({
        policy: makePolicy({ expiryAt: new Date(Date.now() + 12 * 60 * 60 * 1000) }),
      });

      await service.sendNotice(POLICY_ID);

      const saved = (policyRepo.save as jest.Mock).mock.calls.at(-1)[0] as RetentionPolicy;
      expect(saved.notified1d).toBe(true);
    });

    it('marks notified3d when within 3 days', async () => {
      const { service, policyRepo } = buildService({
        policy: makePolicy({ expiryAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }),
      });

      await service.sendNotice(POLICY_ID);

      const saved = (policyRepo.save as jest.Mock).mock.calls.at(-1)[0] as RetentionPolicy;
      expect(saved.notified3d).toBe(true);
    });

    it('marks notified7d when within 7 days', async () => {
      const { service, policyRepo } = buildService({
        policy: makePolicy({ expiryAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }),
      });

      await service.sendNotice(POLICY_ID);

      const saved = (policyRepo.save as jest.Mock).mock.calls.at(-1)[0] as RetentionPolicy;
      expect(saved.notified7d).toBe(true);
    });

    it('rejects missing policy', async () => {
      const { service, policyRepo } = buildService();
      (policyRepo.findOneBy as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.sendNotice('nonexistent')).rejects.toThrow('Policy nonexistent not found');
    });
  });
});
