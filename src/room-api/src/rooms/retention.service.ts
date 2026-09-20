import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { RetentionPolicy } from './retention-policy.entity';
import { Job } from '../jobs/job.entity';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @InjectRepository(RetentionPolicy)
    private readonly policyRepo: Repository<RetentionPolicy>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  async scheduleRetention(roomId: string, retentionUntil: Date): Promise<{ policyId: string }> {
    const graceUntil = new Date(retentionUntil.getTime() + 7 * MS_PER_DAY);

    let policy = await this.policyRepo.findOneBy({ roomId });
    if (policy) {
      policy.expiryAt = retentionUntil;
      policy.graceUntil = graceUntil;
      policy.notified7d = false;
      policy.notified3d = false;
      policy.notified1d = false;
    } else {
      policy = this.policyRepo.create({
        roomId,
        expiryAt: retentionUntil,
        graceUntil,
        action: 'delete',
      });
    }

    const saved = await this.policyRepo.save(policy);
    this.logger.log(`Scheduled retention for room ${roomId}, expires ${retentionUntil.toISOString()}`);
    return { policyId: saved.id };
  }

  async checkExpiryNotices(): Promise<void> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() + 7 * MS_PER_DAY);
    const threeDaysAgo = new Date(now.getTime() + 3 * MS_PER_DAY);
    const oneDayAgo = new Date(now.getTime() + MS_PER_DAY);

    const policies = await this.policyRepo.find({
      where: [
        { expiryAt: Between(now, sevenDaysAgo), notified7d: false },
        { expiryAt: Between(now, threeDaysAgo), notified3d: false },
        { expiryAt: Between(now, oneDayAgo), notified1d: false },
      ],
    });

    for (const policy of policies) {
      if (!policy.notified7d && policy.expiryAt <= sevenDaysAgo && policy.expiryAt > now) {
        await this.enqueueNotice(policy.id, '7d');
      }
      if (!policy.notified3d && policy.expiryAt <= threeDaysAgo && policy.expiryAt > now) {
        await this.enqueueNotice(policy.id, '3d');
      }
      if (!policy.notified1d && policy.expiryAt <= oneDayAgo && policy.expiryAt > now) {
        await this.enqueueNotice(policy.id, '1d');
      }
    }
  }

  private async enqueueNotice(policyId: string, noticeType: string): Promise<void> {
    const job = this.jobRepo.create({ type: `notice_${noticeType}`, policyId });
    await this.jobRepo.save(job);
    this.logger.log(`Enqueued ${noticeType} notice for policy ${policyId}`);
  }

  async processGracePeriod(): Promise<void> {
    const now = new Date();

    const expiredPolicies = await this.policyRepo.find({
      where: {
        expiryAt: LessThanOrEqual(now),
        graceUntil: MoreThanOrEqual(now),
      },
    });

    for (const policy of expiredPolicies) {
      const job = this.jobRepo.create({ type: 'grace_check', policyId: policy.id });
      await this.jobRepo.save(job);
      this.logger.log(`Queued grace check for room ${policy.roomId}`);
    }
  }

  async sendNotice(policyId: string): Promise<void> {
    const policy = await this.policyRepo.findOneBy({ id: policyId });
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const now = new Date();
    const daysUntilExpiry = (policy.expiryAt.getTime() - now.getTime()) / MS_PER_DAY;

    if (daysUntilExpiry <= 1 && daysUntilExpiry > 0) {
      if (!policy.notified1d) {
        policy.notified1d = true;
        this.logger.log(`1-day notice sent for room ${policy.roomId}`);
      }
    } else if (daysUntilExpiry <= 3 && daysUntilExpiry > 1) {
      if (!policy.notified3d) {
        policy.notified3d = true;
        this.logger.log(`3-day notice sent for room ${policy.roomId}`);
      }
    } else if (daysUntilExpiry <= 7 && daysUntilExpiry > 3) {
      if (!policy.notified7d) {
        policy.notified7d = true;
        this.logger.log(`7-day notice sent for room ${policy.roomId}`);
      }
    }

    await this.policyRepo.save(policy);
  }
}
