import { Injectable } from '@nestjs/common';

/**
 * MVP stub: returns buffer unchanged.
 * TODO: integrate real EXIF stripping library (e.g., exif-tools) in Phase 2.
 */
@Injectable()
export class ExifStripperService {
  async stripExif(buffer: Buffer): Promise<Buffer> {
    // MVP stub: GPS and EXIF data not actually stripped
    // Real implementation would use exif-tools or similar
    return buffer;
  }
}
