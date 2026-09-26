import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './job.entity';
import { MediaProcessor } from './media.processor';
import { ZipBuilderService } from './zip.builder.service';
import { NoticeBuilderService } from './notice.builder.service';

@Injectable()
export class JobDispatcher {
  private readonly logger = new Logger(JobDispatcher.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly mediaProcessor: MediaProcessor,
    private readonly zipBuilder: ZipBuilderService,
    private readonly noticeBuilder: NoticeBuilderService,
  ) {}

  @Interval(5000)
  async tick(): Promise<void> {
    const job = await this.jobRepo
      .createQueryBuilder('job')
      .where('job.status = :pending', { pending: 'pending' })
      .addOrderBy('job.createdAt', 'ASC')
      .getOne();

    if (!job) {
      return;
    }

    await this.dispatch(job);
  }

  private async dispatch(job: Job): Promise<void> {
    job.status = 'running';
    job.attempts += 1;
    job.startedAt = job.startedAt ?? new Date();
    await this.jobRepo.save(job);

    try {
      if (job.type === 'process' && job.mediaId) {
        await this.mediaProcessor.process(job);
      } else if (job.type === 'zip' && job.zipId) {
        await this.zipBuilder.buildZip(job.zipId);
      } else if (job.type.startsWith('notice_') && job.policyId) {
        await this.noticeBuilder.sendNotice(job.policyId);
      } else if (job.type === 'grace_check' && job.policyId) {
        await this.handleGraceCheck(job);
      } else {
        job.status = 'failed';
        job.error = `Unknown job type: ${job.type}`;
        job.finishedAt = new Date();
        await this.jobRepo.save(job);
        return;
      }

      job.status = 'done';
      job.error = null;
      job.finishedAt = new Date();
      await this.jobRepo.save(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Job ${job.id} failed: ${message}`);

      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.error = message;
        job.finishedAt = new Date();
        await this.jobRepo.save(job);
        return;
      }

      job.status = 'pending';
      job.error = message;
      await this.jobRepo.save(job);
    }
  }

  private async handleGraceCheck(job: Job): Promise<void> {
    // Grace period check - would query retention policy and decide
    // For now, mark as done (actual logic in RET-04 or future task)
    this.logger.log(`Grace check completed for policy ${job.policyId}`);
  }
}
