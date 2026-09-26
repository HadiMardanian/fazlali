import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
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
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { Media } from './media.entity';
import { Job } from '../jobs/job.entity';
import { Room } from '../rooms/room.entity';
import { Membership } from '../rooms/membership.entity';
import { ContentReport } from '../content/content.entity';
import { InitUploadDto, VALID_MEDIA_KINDS } from './dto/init-upload.dto';
import { MultipartInitDto } from './dto/multipart-init.dto';
import { ListMediaDto } from './dto/list-media.dto';
import { ReportMediaDto } from './dto/report-media.dto';
import { AuditService } from '../audit/audit.service';

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
    @InjectRepository(ContentReport)
    private readonly contentReportRepo: Repository<ContentReport>,
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

  private async checkFairUseCaps(room: Room, addSize: number): Promise<void> {
    const { getPackage } = await import('../rooms/room-packages');
    const pkgConfig = getPackage(room.package ?? 'Basic');

    if (addSize > pkgConfig.maxFileSizeMB * 1024 * 1024) {
      throw new BadRequestException(`File size exceeds package limit of ${pkgConfig.maxFileSizeMB} MB`);
    }

    const stats = await this.mediaRepo.query(
      `SELECT COUNT(*) AS files, COALESCE(SUM("size"), 0) AS volume FROM "media" WHERE "roomId" = $1 AND "status" != 'aborted' AND "status" != 'blocked'`,
      [room.id]
    );
    const files = Number(stats[0]?.files || 0);
    const volume = Number(stats[0]?.volume || 0);

    if (files + 1 > pkgConfig.maxFiles) {
      throw new ForbiddenException(`Room file count limit of ${pkgConfig.maxFiles} reached. Please upgrade package.`);
    }

    if (volume + addSize > pkgConfig.storageGB * 1024 * 1024 * 1024) {
      throw new ForbiddenException(`Room storage limit of ${pkgConfig.storageGB} GB reached. Please upgrade package.`);
    }
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

    await this.checkFairUseCaps(room, dto.size);

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

    await this.checkFairUseCaps(room, dto.size);

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

  async listMedia(
    roomId: string,
    guestToken: string,
    dto: ListMediaDto,
  ): Promise<{ media: Media[]; total: number }> {
    const membership = await this.verifyGuest(roomId, guestToken);
    const room = await this.roomRepo.findOneBy({ id: roomId });
    
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    // Private mode: only owner can see
    if (room.mode === 'Private') {
      throw new ForbiddenException('Private rooms do not allow guest media access');
    }

    // UploadOnly mode: hide others' uploads from guests
    if (room.mode === 'UploadOnly') {
      const ownMedia = await this.mediaRepo.find({
        where: { roomId, uploaderRef: membership.deviceId, status: 'approved' },
        skip: ((dto.page ?? 1) - 1) * (dto.limit ?? 20),
        take: dto.limit ?? 20,
      });
      const total = await this.mediaRepo.count({
        where: { roomId, uploaderRef: membership.deviceId, status: 'approved' },
      });
      return { media: ownMedia, total };
    }

    // Shared/Moderated: show approved media
    const where: any = { roomId, status: 'approved' };
    if (dto.status) {
      where.status = dto.status;
    }

    const [media, total] = await this.mediaRepo.findAndCount({
      where,
      skip: ((dto.page ?? 1) - 1) * (dto.limit ?? 20),
      take: dto.limit ?? 20,
      order: { createdAt: 'DESC' },
    });

    return { media, total };
  }

  async likeMedia(mediaId: string, guestToken: string): Promise<{ liked: boolean }> {
    const membership = await this.verifyGuest(mediaId, guestToken);
    const media = await this.mediaRepo.findOneBy({ id: mediaId });
    
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }
    if (media.status !== 'approved') {
      throw new BadRequestException('Can only like approved media');
    }

    if (!media.likedBy) {
      media.likedBy = [];
    }

    const likeIndex = media.likedBy.indexOf(membership.deviceId);
    if (likeIndex >= 0) {
      media.likedBy.splice(likeIndex, 1);
      await this.mediaRepo.save(media);
      return { liked: false };
    }

    media.likedBy.push(membership.deviceId);
    await this.mediaRepo.save(media);
    return { liked: true };
  }

  async reportMedia(mediaId: string, guestToken: string, dto: ReportMediaDto): Promise<{ reportId: string }> {
    const membership = await this.verifyGuest(mediaId, guestToken);
    const media = await this.mediaRepo.findOneBy({ id: mediaId });
    
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }

    const report = this.contentReportRepo.create({
      mediaId,
      reporterRef: membership.deviceId,
      reason: dto.reason,
      status: 'pending',
    });
    const saved = await this.contentReportRepo.save(report);
    return { reportId: saved.id };
  }

  async approveMedia(mediaId: string, moderatorToken: string): Promise<Media> {
    const membership = await this.verifyGuest(mediaId, moderatorToken);
    if (membership.role !== 'Moderator') {
      throw new ForbiddenException('Only moderators can approve media');
    }

    const media = await this.mediaRepo.findOneBy({ id: mediaId });
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }

    media.status = 'approved';
    media.moderationNote = null;
    await this.mediaRepo.save(media);

    const report = await this.contentReportRepo.findOneBy({ mediaId });
    if (report) {
      report.status = 'reviewed';
      report.handledBy = membership.deviceId;
      report.handledAt = new Date();
      await this.contentReportRepo.save(report);
    }

    return media;
  }

  async rejectMedia(mediaId: string, moderatorToken: string, note?: string): Promise<Media> {
    const membership = await this.verifyGuest(mediaId, moderatorToken);
    if (membership.role !== 'Moderator') {
      throw new ForbiddenException('Only moderators can reject media');
    }

    const media = await this.mediaRepo.findOneBy({ id: mediaId });
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }

    media.status = 'rejected';
    media.moderationNote = note ?? null;
    await this.mediaRepo.save(media);

    const report = await this.contentReportRepo.findOneBy({ mediaId });
    if (report) {
      report.status = 'reviewed';
      report.handledBy = membership.deviceId;
      report.handledAt = new Date();
      await this.contentReportRepo.save(report);
    }

    return media;
  }

  async getBlockedList(roomId: string): Promise<Media[]> {
    return this.mediaRepo.find({
      where: { roomId, status: In(['rejected', 'blocked']) },
      order: { createdAt: 'DESC' },
    });
  }

  private async verifyOwner(roomId: string, actorId: string): Promise<Room> {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    if (room.ownerId !== actorId) {
      throw new ForbiddenException('Owner mismatch');
    }
    return room;
  }

  async deleteMedia(mediaId: string, actorId: string, roomId: string): Promise<void> {
    const media = await this.mediaRepo.findOneBy({ id: mediaId, roomId });
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }
    await this.verifyOwner(roomId, actorId);

    media.status = 'blocked';
    await this.mediaRepo.save(media);
    await this.auditService.log(roomId, actorId, 'delete', mediaId);

    try {
      if (media.originalKey) {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: media.originalKey }));
      }
    } catch {
      // graceful — don't fail on S3 error
    }
  }

  async blockMedia(mediaId: string, actorId: string, roomId: string): Promise<Media> {
    const media = await this.mediaRepo.findOneBy({ id: mediaId, roomId });
    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }
    await this.verifyOwner(roomId, actorId);

    media.status = 'blocked';
    await this.mediaRepo.save(media);
    await this.auditService.log(roomId, actorId, 'block', mediaId);
    return media;
  }
}