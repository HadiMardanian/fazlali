import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RetentionPolicy } from '../rooms/retention-policy.entity';
import { Job } from './job.entity';

@Injectable()
export class NoticeBuilderService {
  private readonly logger = new Logger(NoticeBuilderService.name);

  constructor(
    @InjectRepository(RetentionPolicy)
    private readonly policyRepo: Repository<RetentionPolicy>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  async sendNotice(policyId: string): Promise<void> {
    const policy = await this.policyRepo.findOneBy({ id: policyId });
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilExpiry = (policy.expiryAt.getTime() - now.getTime()) / msPerDay;

    if (daysUntilExpiry <= 1 && daysUntilExpiry > 0 && !policy.notified1d) {
      policy.notified1d = true;
      this.logger.log(`[NOTICE] 1-day expiry notice for room ${policy.roomId}`);
    } else if (daysUntilExpiry <= 3 && daysUntilExpiry > 1 && !policy.notified3d) {
      policy.notified3d = true;
      this.logger.log(`[NOTICE] 3-day expiry notice for room ${policy.roomId}`);
    } else if (daysUntilExpiry <= 7 && daysUntilExpiry > 3 && !policy.notified7d) {
      policy.notified7d = true;
      this.logger.log(`[NOTICE] 7-day expiry notice for room ${policy.roomId}`);
    }

    await this.policyRepo.save(policy);
  }
}
