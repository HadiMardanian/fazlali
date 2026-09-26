import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ZipService } from './zip.service';
import { Zip } from './zip.entity';
import { Room } from '../rooms/room.entity';
import { Job } from '../jobs/job.entity';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.example/zip-url'),
}));
jest.mock('@aws-sdk/client-s3', () => {
  const exports: Record<string, any> = {
    GetObjectCommand: class {},
    PutObjectCommand: class {},
    S3Client: class {
      send = jest.fn(async () => ({}));
    },
  };
  return exports;
});

const ROOM_ID = 'b4b3c9a8-0000-4000-8000-000000000001';
const ZIP_ID = 'b4b3c9a8-0000-4000-8000-000000000002';
const OWNER_ID = 'owner-1';

function makeConfig(values: Record<string, string>) {
  return { get: jest.fn((key: string, def?: string) => values[key] ?? def ?? '') } as any;
}

function makeZip(overrides: Partial<Zip> = {}): Zip {
  return {
    id: ZIP_ID,
    roomId: ROOM_ID,
    status: 'ready',
    fileKey: `${ROOM_ID}/archive/${ZIP_ID}.zip`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    downloadCount: 0,
    maxDownloads: null,
    createdAt: new Date(),
    finishedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Zip;
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: ROOM_ID,
    ownerId: OWNER_ID,
    title: 'Wedding',
    eventDate: null,
    guestCapacity: null,
    mode: 'Private',
    package: null,
    retentionUntil: null,
    status: 'active',
    inviteLink: null,
    pinHash: null,
    branding: null,
    paymentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Room;
}

function buildService(overrides: { zip?: Partial<Zip>; room?: Partial<Room> } = {}) {
  const zipRepo = {
    findOneBy: jest.fn().mockResolvedValue(makeZip(overrides.zip)),
    create: jest.fn().mockImplementation((z: Partial<Zip>) => ({ ...makeZip(), ...z } as Zip)),
    save: jest.fn().mockImplementation((z: Zip) => Promise.resolve(z)),
  };
  const roomRepo = {
    findOneBy: jest.fn().mockResolvedValue(makeRoom(overrides.room)),
  };
  const jobRepo = {
    create: jest.fn().mockImplementation((j: Partial<Job>) => j as Job),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new ZipService(
    zipRepo as any,
    roomRepo as any,
    jobRepo as any,
    makeConfig({ S3_BUCKET: 'test-bucket' }),
    auditService as any,
  );
  return { service, zipRepo, roomRepo, jobRepo, auditService };
}

describe('ZipService', () => {
  describe('createZipRequest', () => {
    it('creates zip record and enqueues job', async () => {
      const { service, zipRepo, jobRepo, roomRepo, auditService } = buildService();

      const result = await service.createZipRequest(ROOM_ID, OWNER_ID);

      expect(result).toEqual({ zipId: ZIP_ID, status: 'pending' });
      expect(roomRepo.findOneBy).toHaveBeenCalledWith({ id: ROOM_ID });
      expect(zipRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ roomId: ROOM_ID, status: 'pending' }),
      );
      expect(jobRepo.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'zip' }));
      expect(auditService.log).toHaveBeenCalledWith(ROOM_ID, OWNER_ID, 'download', 'full-zip');
    });

    it('rejects unknown room with 404', async () => {
      const { service, roomRepo } = buildService();
      (roomRepo.findOneBy as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.createZipRequest(ROOM_ID, OWNER_ID))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects wrong owner with 403', async () => {
      const { service, roomRepo } = buildService();
      (roomRepo.findOneBy as jest.Mock).mockImplementationOnce(() => makeRoom({ ownerId: 'other-owner' }));

      await expect(service.createZipRequest(ROOM_ID, OWNER_ID))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getZipDownload', () => {
    it('returns presigned URL for ready zip', async () => {
      const { service, zipRepo } = buildService();

      const result = await service.getZipDownload(ZIP_ID);

      expect(result).toEqual({ url: 'https://presigned.example/zip-url', expiresIn: 3600 });
      expect(zipRepo.findOneBy).toHaveBeenCalledWith({ id: ZIP_ID });
      const saved = (zipRepo.save as jest.Mock).mock.calls.at(-1)[0] as Zip;
      expect(saved.downloadCount).toBe(1);
    });

    it('rejects missing zip with 404', async () => {
      const { service, zipRepo } = buildService();
      (zipRepo.findOneBy as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.getZipDownload(ZIP_ID))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects non-ready zip with 404', async () => {
      const { service } = buildService({ zip: { status: 'pending' } });

      await expect(service.getZipDownload(ZIP_ID))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects expired zip with 404', async () => {
      const { service } = buildService({
        zip: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(service.getZipDownload(ZIP_ID))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects zip without fileKey with 404', async () => {
      const { service } = buildService({ zip: { fileKey: null } });

      await expect(service.getZipDownload(ZIP_ID))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
