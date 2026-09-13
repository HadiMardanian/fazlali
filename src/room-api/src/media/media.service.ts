import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { Media } from './media.entity';
import { Job } from '../jobs/job.entity';
import { Room } from '../rooms/room.entity';
import { Membership } from '../rooms/membership.entity';
import { InitUploadDto, VALID_MEDIA_KINDS } from './dto/init-upload.dto';
import { MultipartInitDto } from './dto/multipart-init.dto';

const PRESIGNED_URL_TTL_SECONDS = 900;
const MULTIPART_TTL_MS = 24 * 60 * 60 * 1000;

export interface MultipartPart {
  partNumber: number;
  eTag: string;
}

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucketName: string;

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    config: ConfigService,
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

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async verifyGuest(roomId: string, guestToken: string): Promise<Membership> {
    if (!guestToken) {
      throw new ForbiddenException('Guest token required');
    }
    const tokenHash = this.hashToken(guestToken);
    const membership = await this.membershipRepo.findOneBy({ roomId, tokenHash });
    if (!membership || membership.blocked) {
      throw new ForbiddenException('Invalid or blocked guest token');
    }
    if (!membership.sessionExpiry || membership.sessionExpiry.getTime() <= Date.now()) {
      throw new ForbiddenException('Guest token expired');
    }
    return membership;
  }

  async initUpload(
    roomId: string,
    dto: InitUploadDto,
    guestToken: string,
  ): Promise<{ mediaId: string; presignedUrl: string; expiresIn: number; status: string }> {
    if (!VALID_MEDIA_KINDS.includes(dto.kind)) {
      throw new BadRequestException(`Invalid kind: ${dto.kind}. Must be photo or video`);
    }

    const membership = await this.verifyGuest(roomId, guestToken);

    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    const media = this.mediaRepo.create({
      roomId,
      uploaderRef: membership.deviceId,
      kind: dto.kind,
      originalKey: '',
      size: dto.size,
      mime: dto.mime,
      status: 'temp',
    });
    const saved = await this.mediaRepo.save(media);

    saved.originalKey = `${roomId}/${saved.id}/original`;
    await this.mediaRepo.save(saved);

    const presignedUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: saved.originalKey,
        ContentType: dto.mime,
        ContentLength: dto.size,
      }),
      { expiresIn: PRESIGNED_URL_TTL_SECONDS },
    );

    return {
      mediaId: saved.id,
      presignedUrl,
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
      status: 'temp',
    };
  }

  async complete(mediaId: string): Promise<{ mediaId: string; status: string }> {
    const media = await this.mediaRepo.findOneBy({ id: mediaId });
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }
    if (media.status !== 'temp') {
      throw new BadRequestException(`Media ${mediaId} not in uploading state`);
    }
    if (media.multipartUploadId) {
      throw new BadRequestException(
        `Media ${mediaId} is a multipart upload; use multipart:complete`,
      );
    }

    media.status = 'queued';
    await this.mediaRepo.save(media);
    await this.enqueueProcess(mediaId);

    return { mediaId, status: 'queued' };
  }

  private async enqueueProcess(mediaId: string): Promise<void> {
    const job = this.jobRepo.create({ mediaId, type: 'process' });
    await this.jobRepo.save(job);
  }

  private isStale(media: Media): boolean {
    return (
      !!media.uploadStartedAt &&
      media.status === 'temp' &&
      Date.now() - media.uploadStartedAt.getTime() > MULTIPART_TTL_MS
    );
  }

  async multipartInit(
    roomId: string,
    dto: MultipartInitDto,
    guestToken: string,
  ): Promise<{ mediaId: string; uploadId: string; totalParts: number; partSize: number; status: string }> {
    if (dto.kind !== 'video') {
      throw new BadRequestException('Multipart upload is only supported for video');
    }

    const membership = await this.verifyGuest(roomId, guestToken);

    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    const media = this.mediaRepo.create({
      roomId,
      uploaderRef: membership.deviceId,
      kind: dto.kind,
      originalKey: '',
      size: dto.size,
      mime: dto.mime,
      status: 'temp',
      totalParts: dto.totalParts,
      uploadStartedAt: new Date(),
    });
    const saved = await this.mediaRepo.save(media);

    saved.originalKey = `${roomId}/${saved.id}/original`;
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: saved.originalKey,
      ContentType: dto.mime,
    });
    const multipart = await this.s3.send(createCommand);
    if (!multipart.UploadId) {
      throw new Error('S3 did not return a multipart UploadId');
    }
    saved.multipartUploadId = multipart.UploadId;
    await this.mediaRepo.save(saved);

    const partSize = Math.ceil(dto.size / dto.totalParts);

    return {
      mediaId: saved.id,
      uploadId: multipart.UploadId,
      totalParts: dto.totalParts,
      partSize,
      status: 'temp',
    };
  }

  async multipartPartUrl(
    mediaId: string,
    partNumber: number,
  ): Promise<{ partNumber: number; presignedUrl: string; expiresIn: number }> {
    const media = await this.mediaRepo.findOneBy({ id: mediaId });
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }
    if (media.status !== 'temp') {
      throw new BadRequestException(`Media ${mediaId} not in uploading state`);
    }
    if (!media.multipartUploadId) {
      throw new BadRequestException(`Media ${mediaId} has no multipart upload`);
    }
    if (media.totalParts !== null && (partNumber < 1 || partNumber > media.totalParts)) {
      throw new BadRequestException(`partNumber out of range 1..${media.totalParts}`);
    }
    if (this.isStale(media)) {
      await this.multipartAbort(media.id, true);
      throw new BadRequestException('Multipart upload expired and was aborted');
    }

    const presignedUrl = await getSignedUrl(
      this.s3,
      new UploadPartCommand({
        Bucket: this.bucketName,
        Key: media.originalKey,
        UploadId: media.multipartUploadId,
        PartNumber: partNumber,
      }),
      { expiresIn: PRESIGNED_URL_TTL_SECONDS },
    );

    return { partNumber, presignedUrl, expiresIn: PRESIGNED_URL_TTL_SECONDS };
  }

  async multipartComplete(
    mediaId: string,
    parts: MultipartPart[],
  ): Promise<{ mediaId: string; status: string }> {
    const media = await this.mediaRepo.findOneBy({ id: mediaId });
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }
    if (media.status !== 'temp') {
      throw new BadRequestException(`Media ${mediaId} not in uploading state`);
    }
    if (!media.multipartUploadId) {
      throw new BadRequestException(`Media ${mediaId} has no multipart upload`);
    }
    if (this.isStale(media)) {
      await this.multipartAbort(media.id, true);
      throw new BadRequestException('Multipart upload expired and was aborted');
    }

    const totalParts = media.totalParts ?? parts.length;
    if (parts.length !== totalParts) {
      throw new BadRequestException(`Expected ${totalParts} parts, got ${parts.length}`);
    }
    const seen = new Set<number>();
    for (const part of parts) {
      if (part.partNumber < 1 || part.partNumber > totalParts || seen.has(part.partNumber)) {
        throw new BadRequestException('Part numbers must be unique and within range 1..total');
      }
      seen.add(part.partNumber);
    }

    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: media.originalKey,
        UploadId: media.multipartUploadId,
        MultipartUpload: {
          Parts: parts
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((p) => ({ PartNumber: p.partNumber, ETag: p.eTag })),
        },
      }),
    );

    media.status = 'queued';
    await this.mediaRepo.save(media);
    await this.enqueueProcess(mediaId);

    return { mediaId, status: 'queued' };
  }

  async multipartAbort(
    mediaId: string,
    force = false,
  ): Promise<{ mediaId: string; status: string }> {
    const media = await this.mediaRepo.findOneBy({ id: mediaId });
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }
    if (!media.multipartUploadId) {
      throw new BadRequestException(`Media ${mediaId} has no multipart upload`);
    }
    if (media.status !== 'temp' && !force) {
      throw new BadRequestException(`Media ${mediaId} not in uploading state`);
    }

    await this.s3.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: media.originalKey,
        UploadId: media.multipartUploadId,
      }),
    );

    media.status = 'aborted';
    await this.mediaRepo.save(media);

    return { mediaId, status: 'aborted' };
  }
}