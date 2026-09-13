import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { Media } from './media.entity';
import { Job } from '../jobs/job.entity';
import { Room } from '../rooms/room.entity';
import { Membership } from '../rooms/membership.entity';
import { RoomMode } from '../rooms/room-mode.enum';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.example/put-url'),
}));
jest.mock('@aws-sdk/client-s3', () => {
  const classes = [
    'PutObjectCommand',
    'CreateMultipartUploadCommand',
    'UploadPartCommand',
    'CompleteMultipartUploadCommand',
    'AbortMultipartUploadCommand',
  ];
  const exports: Record<string, any> = {};
  for (const name of classes) {
    exports[name] = class {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    };
    Object.defineProperty(exports[name], 'name', { value: name });
  }
  exports.S3Client = class {
    send = jest.fn(async (cmd: any) => {
      if (cmd.constructor.name === 'CreateMultipartUploadCommand') {
        return { UploadId: 'upload-1' };
      }
      return {};
    });
  };
  return exports;
});

const ROOM_ID = 'b4b3c9a8-0000-4000-8000-000000000001';
const MEDIA_ID = 'b4b3c9a8-0000-4000-8000-000000000002';

const room: Room = {
  id: ROOM_ID,
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

const activeMembership: Membership = {
  id: 'm1',
  roomId: ROOM_ID,
  deviceId: 'device-1',
  displayName: 'Sara',
  role: 'Guest',
  tokenHash: 'abc',
  sessionExpiry: new Date(Date.now() + 60 * 60 * 1000),
  blocked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Membership;

function makeConfig(values: Record<string, string>) {
  return { get: jest.fn((key: string, def?: string) => values[key] ?? def ?? '') } as any;
}

function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: MEDIA_ID,
    roomId: ROOM_ID,
    uploaderRef: 'device-1',
    kind: 'photo',
    originalKey: `${ROOM_ID}/${MEDIA_ID}/original`,
    multipartUploadId: null,
    totalParts: null,
    uploadStartedAt: null,
    size: 1024,
    mime: 'image/jpeg',
    status: 'temp',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Media;
}

function buildService(membership: Membership | null, media = makeMedia()) {
  const mediaRepo = {
    findOneBy: jest.fn().mockResolvedValue(media),
    create: jest.fn().mockImplementation((m: Partial<Media>) => ({ ...m, id: MEDIA_ID } as Media)),
    save: jest.fn().mockImplementation((m: Media) => Promise.resolve(m)),
  };
  const roomRepo = { findOneBy: jest.fn().mockResolvedValue(room) };
  const membershipRepo = { findOneBy: jest.fn().mockResolvedValue(membership) };
  const jobRepo = {
    create: jest.fn().mockImplementation((j: Partial<Job>) => j as Job),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const service = new MediaService(
    mediaRepo as any,
    roomRepo as any,
    membershipRepo as any,
    jobRepo as any,
    makeConfig({ S3_BUCKET: 'test-bucket' }),
  );
  return { service, mediaRepo, roomRepo, membershipRepo, jobRepo };
}

describe('MediaService', () => {
  describe('initUpload', () => {
    it('returns presignedUrl + media row with originalKey', async () => {
      const { service, mediaRepo } = buildService(activeMembership);

      const result = await service.initUpload(ROOM_ID, {
        name: 'photo.jpg',
        size: 1024,
        mime: 'image/jpeg',
        kind: 'photo',
      }, 'guest-token');

      expect(result).toEqual({
        mediaId: MEDIA_ID,
        presignedUrl: 'https://presigned.example/put-url',
        expiresIn: 900,
        status: 'temp',
      });
      expect(mediaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ roomId: ROOM_ID, status: 'temp' }),
      );
      const saved = (mediaRepo.save as jest.Mock).mock.calls.at(-1)[0] as Media;
      expect(saved.originalKey).toBe(`${ROOM_ID}/${MEDIA_ID}/original`);
    });

    it('rejects missing guest token with 403', async () => {
      const { service } = buildService(null);
      await expect(
        service.initUpload(ROOM_ID, { name: 'a', size: 1, mime: 'image/jpeg', kind: 'photo' }, ''),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects expired session with 403', async () => {
      const expired = {
        ...activeMembership,
        sessionExpiry: new Date(Date.now() - 1000),
      } as unknown as Membership;
      const { service } = buildService(expired);
      await expect(
        service.initUpload(ROOM_ID, { name: 'a', size: 1, mime: 'image/jpeg', kind: 'photo' }, 't'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects blocked device with 403', async () => {
      const blocked = { ...activeMembership, blocked: true } as unknown as Membership;
      const { service } = buildService(blocked);
      await expect(
        service.initUpload(ROOM_ID, { name: 'a', size: 1, mime: 'image/jpeg', kind: 'photo' }, 't'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects unknown room with 404', async () => {
      const { service, roomRepo } = buildService(activeMembership);
      roomRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(
        service.initUpload(ROOM_ID, { name: 'a', size: 1, mime: 'image/jpeg', kind: 'photo' }, 't'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects invalid kind with 400', async () => {
      const { service } = buildService(activeMembership);
      await expect(
        service.initUpload(ROOM_ID, { name: 'a', size: 1, mime: 'image/jpeg', kind: 'audio' as any }, 't'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('complete', () => {
    it('flips temp -> queued', async () => {
      const { service } = buildService(null);
      const result = await service.complete(MEDIA_ID);
      expect(result).toEqual({ mediaId: MEDIA_ID, status: 'queued' });
    });

    it('rejects unknown media with 404', async () => {
      const { service, mediaRepo } = buildService(null);
      mediaRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.complete(MEDIA_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects non-temp media with 400', async () => {
      const { service } = buildService(null, makeMedia({ status: 'queued' }));
      await expect(service.complete(MEDIA_ID)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects multipart media on single complete with 400', async () => {
      const { service } = buildService(null, makeMedia({ multipartUploadId: 'upload-1' }));
      await expect(service.complete(MEDIA_ID)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('multipartInit', () => {
    it('creates media + S3 multipart, returns uploadId/partSize', async () => {
      const { service, mediaRepo } = buildService(activeMembership);

      const result = await service.multipartInit(ROOM_ID, {
        name: 'video.mp4',
        size: 1024,
        mime: 'video/mp4',
        kind: 'video',
        totalParts: 2,
      }, 'guest-token');

      expect(result).toEqual({
        mediaId: MEDIA_ID,
        uploadId: 'upload-1',
        totalParts: 2,
        partSize: 512,
        status: 'temp',
      });
      const s3 = (service as any).s3;
      const calls = s3.send.mock.calls.map((c: any[]) => c[0].constructor.name);
      expect(calls).toContain('CreateMultipartUploadCommand');
      expect(mediaRepo.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'video' }));
    });

    it('rejects non-video kind with 400', async () => {
      const { service } = buildService(activeMembership);
      await expect(
        service.multipartInit(ROOM_ID, {
          name: 'a', size: 1, mime: 'image/jpeg', kind: 'photo', totalParts: 1,
        }, 't'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects bad token with 403', async () => {
      const { service } = buildService(null);
      await expect(
        service.multipartInit(ROOM_ID, {
          name: 'a', size: 1, mime: 'video/mp4', kind: 'video', totalParts: 1,
        }, 't'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('multipartPartUrl', () => {
    const mpMedia = () => makeMedia({
      kind: 'video',
      multipartUploadId: 'upload-1',
      totalParts: 2,
      uploadStartedAt: new Date(),
    });

    it('returns presigned part url', async () => {
      const { service } = buildService(null, mpMedia());
      const result = await service.multipartPartUrl(MEDIA_ID, 2);
      expect(result).toEqual({
        partNumber: 2,
        presignedUrl: 'https://presigned.example/put-url',
        expiresIn: 900,
      });
    });

    it('rejects out-of-range partNumber with 400', async () => {
      const { service } = buildService(null, mpMedia());
      await expect(service.multipartPartUrl(MEDIA_ID, 3)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-temp media with 400', async () => {
      const { service } = buildService(null, makeMedia({ status: 'queued', multipartUploadId: 'u', totalParts: 1, uploadStartedAt: new Date() }));
      await expect(service.multipartPartUrl(MEDIA_ID, 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('auto-aborts stale upload then 400', async () => {
      const stale = mpMedia();
      stale.uploadStartedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const { service, mediaRepo } = buildService(null, stale);

      await expect(service.multipartPartUrl(MEDIA_ID, 1)).rejects.toBeInstanceOf(BadRequestException);
      const s3calls = (service as any).s3.send.mock.calls.map((c: any[]) => c[0].constructor.name);
      expect(s3calls).toContain('AbortMultipartUploadCommand');
      const saved = (mediaRepo.save as jest.Mock).mock.calls.at(-1)[0] as Media;
      expect(saved.status).toBe('aborted');
    });
  });

  describe('multipartComplete', () => {
    const mpMedia = () => makeMedia({
      kind: 'video',
      multipartUploadId: 'upload-1',
      totalParts: 2,
      uploadStartedAt: new Date(),
    });

    it('valid complete flips temp -> queued', async () => {
      const { service, mediaRepo } = buildService(null, mpMedia());
      const result = await service.multipartComplete(MEDIA_ID, [
        { partNumber: 1, eTag: 'e1' },
        { partNumber: 2, eTag: 'e2' },
      ]);
      expect(result).toEqual({ mediaId: MEDIA_ID, status: 'queued' });
      const s3calls = (service as any).s3.send.mock.calls.map((c: any[]) => c[0].constructor.name);
      expect(s3calls).toContain('CompleteMultipartUploadCommand');
      const saved = (mediaRepo.save as jest.Mock).mock.calls.at(-1)[0] as Media;
      expect(saved.status).toBe('queued');
    });

    it('rejects wrong part count with 400', async () => {
      const { service } = buildService(null, mpMedia());
      await expect(
        service.multipartComplete(MEDIA_ID, [{ partNumber: 1, eTag: 'e1' }]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate part numbers with 400', async () => {
      const { service } = buildService(null, mpMedia());
      await expect(
        service.multipartComplete(MEDIA_ID, [
          { partNumber: 1, eTag: 'e1' },
          { partNumber: 1, eTag: 'e2' },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('multipartAbort', () => {
    it('aborts and marks media aborted', async () => {
      const media = makeMedia({
        kind: 'video',
        multipartUploadId: 'upload-1',
        totalParts: 2,
        uploadStartedAt: new Date(),
      });
      const { service } = buildService(null, media);
      const result = await service.multipartAbort(MEDIA_ID);
      expect(result).toEqual({ mediaId: MEDIA_ID, status: 'aborted' });
      const s3calls = (service as any).s3.send.mock.calls.map((c: any[]) => c[0].constructor.name);
      expect(s3calls).toContain('AbortMultipartUploadCommand');
    });

    it('rejects media without multipart upload with 400', async () => {
      const { service } = buildService(null, makeMedia());
      await expect(service.multipartAbort(MEDIA_ID)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});