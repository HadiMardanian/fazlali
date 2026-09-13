import { MediaProcessor } from './media.processor';
import { Job } from './job.entity';
import { Media } from '../media/media.entity';

jest.mock('@nestjs/schedule', () => ({
  Interval: () => () => undefined,
}));

jest.mock('@aws-sdk/client-s3', () => {
  const classes = ['PutObjectCommand', 'CopyObjectCommand', 'CreateMultipartUploadCommand', 'UploadPartCommand', 'CompleteMultipartUploadCommand', 'AbortMultipartUploadCommand'];
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
    send = jest.fn(async () => ({}));
  };
  return exports;
});

const JOB_ID = 'b4b3c9a8-0000-4000-8000-000000000010';
const MEDIA_ID = 'b4b3c9a8-0000-4000-8000-000000000002';
const ROOM_ID = 'b4b3c9a8-0000-4000-8000-000000000001';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: JOB_ID,
    type: 'process',
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    error: null,
    mediaId: MEDIA_ID,
    createdAt: new Date(),
    startedAt: null,
    finishedAt: null,
    updatedAt: new Date(),
    ...overrides,
  } as Job;
}

function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: MEDIA_ID,
    roomId: ROOM_ID,
    uploaderRef: 'device-1',
    kind: 'video',
    originalKey: `${ROOM_ID}/${MEDIA_ID}/original`,
    thumbKey: null,
    webKey: null,
    multipartUploadId: null,
    totalParts: null,
    uploadStartedAt: null,
    size: 1024,
    mime: 'video/mp4',
    status: 'queued',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Media;
}

function makeConfig(values: Record<string, string>) {
  return { get: jest.fn((key: string, def?: string) => values[key] ?? def ?? '') } as any;
}

function buildProcessor(job: Job | null, media: Media | null) {
  const jobSaves: any[] = [];
  const mediaSaves: any[] = [];
  const jobRepo = {
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(job),
    }),
    save: jest.fn().mockImplementation((j: Job) => {
      jobSaves.push({ ...j });
      return Promise.resolve(j);
    }),
  };
  const mediaRepo = {
    findOneBy: jest.fn().mockResolvedValue(media),
    save: jest.fn().mockImplementation((m: Media) => {
      mediaSaves.push({ ...m });
      return Promise.resolve(m);
    }),
  };
  const processor = new MediaProcessor(
    jobRepo as any,
    mediaRepo as any,
    makeConfig({ S3_BUCKET: 'test-bucket', PROCESSOR_ENABLED: 'true' }),
  );
  return { processor, jobRepo, mediaRepo, jobSaves, mediaSaves };
}

describe('MediaProcessor', () => {
  it('claims job, copies thumb+web, marks media approved and job done', async () => {
    const { processor, jobSaves, mediaSaves } = buildProcessor(
      makeJob(),
      makeMedia({ status: 'queued' }),
    );

    await processor.tick();

    expect(jobSaves.some((j: any) => j.status === 'running' && j.attempts === 1)).toBe(true);
    expect(jobSaves.at(-1)).toEqual(expect.objectContaining({ status: 'done', error: null }));

    expect(mediaSaves.some((m: any) => m.status === 'processing')).toBe(true);
    expect(mediaSaves.at(-1)).toEqual(
      expect.objectContaining({
        status: 'approved',
        thumbKey: `${ROOM_ID}/${MEDIA_ID}/thumb`,
        webKey: `${ROOM_ID}/${MEDIA_ID}/web`,
      }),
    );

    const s3calls = (processor as any).s3.send.mock.calls.map((c: any[]) => c[0].constructor.name);
    expect(s3calls).toEqual(['CopyObjectCommand', 'CopyObjectCommand']);
  });

  it('retries S3 failure until maxAttempts then fails terminal', async () => {
    const job = makeJob({ status: 'pending', attempts: 4 });
    const { processor, jobRepo, mediaSaves } = buildProcessor(job, makeMedia({ status: 'queued' }));
    (processor as any).s3.send.mockRejectedValue(new Error('boom'));

    await processor.tick();

    expect(jobRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    const mediaSnapshots = mediaSaves.map((s: any) => ({ ...s }));
    expect(mediaSnapshots.some((m: any) => m.status === 'processing')).toBe(true);
    expect(mediaSnapshots.some((m: any) => m.status === 'queued')).toBe(false);
  });

  it('repends job when attempts remain below max', async () => {
    const job = makeJob({ status: 'pending', attempts: 0 });
    const { processor, jobRepo, mediaRepo } = buildProcessor(job, makeMedia({ status: 'queued' }));
    (processor as any).s3.send.mockRejectedValue(new Error('boom'));

    await processor.tick();

    expect(jobRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', error: 'boom' }));
    expect(mediaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued' }));
  });

  it('no-ops when no pending job', async () => {
    const { processor, jobRepo, mediaRepo } = buildProcessor(null, null);
    await processor.tick();
    expect(jobRepo.createQueryBuilder).toHaveBeenCalled();
    expect(jobRepo.save).not.toHaveBeenCalled();
    expect(mediaRepo.save).not.toHaveBeenCalled();
  });

  it('no-ops when processor disabled', async () => {
    const processor = new MediaProcessor(
      { createQueryBuilder: jest.fn() } as any,
      { findOneBy: jest.fn() } as any,
      makeConfig({ S3_BUCKET: 'b', PROCESSOR_ENABLED: 'false' }),
    );
    await processor.tick();
    expect((processor as any).jobRepo.createQueryBuilder).not.toHaveBeenCalled();
  });
});