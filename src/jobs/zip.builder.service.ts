import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import * as zlib from 'zlib';
import { Zip } from '../zip/zip.entity';
import { Media } from '../media/media.entity';

@Injectable()
export class ZipBuilderService {
  private readonly logger = new Logger(ZipBuilderService.name);
  private readonly s3: S3Client;
  private readonly bucketName: string;

  constructor(
    @InjectRepository(Zip)
    private readonly zipRepo: Repository<Zip>,
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
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

  async buildZip(zipId: string): Promise<void> {
    const zip = await this.zipRepo.findOneBy({ id: zipId });
    if (!zip) {
      throw new Error(`Zip ${zipId} not found`);
    }

    zip.status = 'building';
    await this.zipRepo.save(zip);

    try {
      const mediaList = await this.mediaRepo.find({
        where: { roomId: zip.roomId, status: 'approved' },
      });

      if (mediaList.length === 0) {
        throw new Error('No approved media found for room');
      }

      const chunks: Buffer[] = [];
      const centralDirRecords: Buffer[] = [];
      let totalEntries = 0;

      for (const media of mediaList) {
        const object = await this.s3.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: media.originalKey,
          }),
        );

        if (!object.Body) {
          continue;
        }

        const data = Buffer.from(await object.Body.transformToByteArray());
        const fileName = `${media.id}${this.getExtension(media.mime)}`;
        const compressed = zlib.deflateSync(data);
        const crc = this.crc32(data);

        const localHeader = this.createLocalFileHeader(fileName, compressed, crc);
        const localOffset = chunks.length === 0 ? 0 : Buffer.concat(chunks).length;

        chunks.push(localHeader);
        chunks.push(compressed);

        const centralDir = this.createCentralDirEntry(fileName, compressed, crc, localOffset);
        centralDirRecords.push(centralDir);
        totalEntries++;
      }

      const centralDirBuffer = Buffer.concat(centralDirRecords);
      const eocd = this.createEndOfCentralDirectory(totalEntries, centralDirBuffer.length);

      chunks.push(centralDirBuffer);
      chunks.push(eocd);

      const zipBuffer = Buffer.concat(chunks);
      const fileKey = `${zip.roomId}/archive/${zipId}.zip`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
          Body: zipBuffer,
          ContentType: 'application/zip',
        }),
      );

      zip.fileKey = fileKey;
      zip.status = 'ready';
      zip.finishedAt = new Date();
      await this.zipRepo.save(zip);

      this.logger.log(`Zip ${zipId} built successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Zip build failed for ${zipId}: ${message}`);

      zip.status = 'expired';
      zip.finishedAt = new Date();
      await this.zipRepo.save(zip);
      throw err;
    }
  }

  private crc32(buffer: Buffer): number {
    let crc = 0xffffffff;
    const table = this.getCrcTable();

    for (let i = 0; i < buffer.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private getCrcTable(): number[] {
    const table: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
    return table;
  }

  private writeUint32LE(value: number): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(value, 0);
    return buf;
  }

  private writeUint16LE(value: number): Buffer {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(value, 0);
    return buf;
  }

  private createLocalFileHeader(fileName: string, compressed: Buffer, crc: number): Buffer {
    const nameBuffer = Buffer.from(fileName, 'utf8');
    const version = 20;
    const flags = 0;
    const method = 8;

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(version, 4);
    header.writeUInt16LE(flags, 6);
    header.writeUInt16LE(method, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(nameBuffer.length, 22);
    header.writeUInt32LE(0, 26);

    return Buffer.concat([header, nameBuffer]);
  }

  private createCentralDirEntry(fileName: string, compressed: Buffer, crc: number, offset: number): Buffer {
    const nameBuf = Buffer.from(fileName, 'utf8');
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(0, 8);
    record.writeUInt16LE(8, 10);
    record.writeUInt16LE(0, 12);
    record.writeUInt16LE(0, 14);
    record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(compressed.length, 20);
    record.writeUInt32LE(compressed.length, 24);
    record.writeUInt16LE(nameBuf.length, 28);
    record.writeUInt16LE(0, 30);
    record.writeUInt16LE(0, 32);
    record.writeUInt16LE(0, 34);
    record.writeUInt16LE(0, 36);
    record.writeUInt32LE(0, 38);
    record.writeUInt32LE(offset, 42);

    return Buffer.concat([record, nameBuf]);
  }

  private createEndOfCentralDirectory(entries: number, centralDirSize: number): Buffer {
    const signature = this.writeUint32LE(0x06054b50);
    const diskNumber = this.writeUint16LE(0);
    const diskStart = this.writeUint16LE(0);
    const entriesOnDisk = this.writeUint16LE(entries);
    const totalEntries = this.writeUint16LE(entries);
    const centralDirLength = this.writeUint32LE(centralDirSize);
    const centralDirOffset = this.writeUint32LE(0);
    const commentLength = this.writeUint16LE(0);

    return Buffer.concat([
      signature,
      diskNumber,
      diskStart,
      entriesOnDisk,
      totalEntries,
      centralDirLength,
      centralDirOffset,
      commentLength,
    ]);
  }

  private getExtension(mime: string): string {
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
    };
    return extMap[mime] || '.bin';
  }
}
