import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Zip } from './zip.entity';
import { Room } from '../rooms/room.entity';
import { Job } from '../jobs/job.entity';
import { AuditService } from '../audit/audit.service';

const ZIP_DOWNLOAD_TTL_SECONDS = 3600;
const ZIP_EXPIRY_DAYS = 7;

@Injectable()
export class ZipService {
  private readonly s3: S3Client;
  private readonly bucketName: string;

  constructor(
    @InjectRepository(Zip)
    private readonly zipRepo: Repository<Zip>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    config: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.bucketName = config.get<string>('S3_BUCKET') || '';
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

  async createZipRequest(roomId: string, ownerId: string, pkg: string): Promise<{ zipId: string; status: string }> {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    if (room.ownerId !== ownerId) {
      throw new ForbiddenException('Owner mismatch');
    }

    const { getPackage } = await import('../rooms/room-packages');
    const pkgConfig = getPackage(pkg);
    if (!pkgConfig.zipAllow) {
      throw new ForbiddenException('ZIP downloads not allowed in this package. Please upgrade.');
    }

    const zip = this.zipRepo.create({
      roomId,
      status: 'pending',
      maxDownloads: pkgConfig.zipDownloadLimit,
      expiresAt: new Date(Date.now() + ZIP_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });
    const saved = await this.zipRepo.save(zip);

    const job = this.jobRepo.create({ type: 'zip', zipId: saved.id });
    await this.jobRepo.save(job);

    await this.auditService.log(roomId, ownerId, 'download', 'full-zip');

    return { zipId: saved.id, status: 'pending' };
  }

  async getZipDownload(zipId: string): Promise<{ url: string; expiresIn: number }> {
    const zip = await this.zipRepo.findOneBy({ id: zipId });
    if (!zip) {
      throw new NotFoundException(`Zip ${zipId} not found`);
    }
    if (zip.status !== 'ready') {
      throw new NotFoundException(`Zip ${zipId} is not ready`);
    }
    if (zip.expiresAt && zip.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException(`Zip ${zipId} has expired`);
    }
    if (!zip.fileKey) {
      throw new NotFoundException(`Zip ${zipId} has no file`);
    }
    if (zip.maxDownloads && zip.downloadCount >= zip.maxDownloads) {
      throw new ForbiddenException(`Download limit of ${zip.maxDownloads} reached. Please upgrade or extend your package.`);
    }

    zip.downloadCount += 1;
    await this.zipRepo.save(zip);

    const presignedUrl = await getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: zip.fileKey,
      }),
      { expiresIn: ZIP_DOWNLOAD_TTL_SECONDS },
    );

    return { url: presignedUrl, expiresIn: ZIP_DOWNLOAD_TTL_SECONDS };
  }
}
