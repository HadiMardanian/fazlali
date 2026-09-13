import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  S3Client,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { Job } from './job.entity';
import { Media } from '../media/media.entity';

@Injectable()
export class MediaProcessor {
  private readonly logger = new Logger(MediaProcessor.name);
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    config: ConfigService,
  ) {
    this.bucketName = config.get<string>('S3_BUCKET') || '';
    this.enabled = config.get<string>('PROCESSOR_ENABLED', 'true') === 'true';
    this.s3 = new S3Client({
      region: config.get<string>('S3_REGION', 'us-east-1'),
      endpoint: config.get<string>('S3_ENDPOINT') || undefined,
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true',
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY_ID') || 'minio',
        secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY') || 'minio123',
      },
    });
  }

  @Interval(process.env.PROCESSOR_INTERVAL_MS ? Number(process.env.PROCESSOR_INTERVAL_MS) : 5000)
  async tick(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const job = await this.jobRepo
      .createQueryBuilder('job')
      .where('job.status = :pending', { pending: 'pending' })
      .addOrderBy('job.createdAt', 'ASC')
      .getOne();

    if (!job) {
      return;
    }

    await this.process(job);
  }

  private async process(job: Job): Promise<void> {
    if (!job.mediaId) {
      job.status = 'failed';
      job.error = 'Job has no mediaId';
      job.finishedAt = new Date();
      await this.jobRepo.save(job);
      return;
    }

    const media = await this.mediaRepo.findOneBy({ id: job.mediaId });
    if (!media) {
      job.status = 'failed';
      job.error = `Media ${job.mediaId} not found`;
      job.finishedAt = new Date();
      await this.jobRepo.save(job);
      return;
    }

    job.status = 'running';
    job.attempts += 1;
    job.startedAt = job.startedAt ?? new Date();
    await this.jobRepo.save(job);

    media.status = 'processing';
    await this.mediaRepo.save(media);

    try {
      media.thumbKey = `${media.roomId}/${media.id}/thumb`;
      media.webKey = `${media.roomId}/${media.id}/web`;

      await this.s3.send(
        new CopyObjectCommand({
          Bucket: this.bucketName,
          Key: media.thumbKey,
          CopySource: `/${this.bucketName}/${media.originalKey}`,
          ContentType: media.mime,
        }),
      );
      await this.s3.send(
        new CopyObjectCommand({
          Bucket: this.bucketName,
          Key: media.webKey,
          CopySource: `/${this.bucketName}/${media.originalKey}`,
          ContentType: media.mime,
        }),
      );

      media.status = 'approved';
      await this.mediaRepo.save(media);

      job.status = 'done';
      job.error = null;
      job.finishedAt = new Date();
      await this.jobRepo.save(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Processing failed for job ${job.id}: ${message}`);

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

      media.status = 'queued';
      await this.mediaRepo.save(media);
    }
  }
}