import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { Media } from '../media/media.entity';
import { MediaProcessor } from './media.processor';
import { ExifStripperService } from './exif-stripper.service';
import { MalwareScannerService } from './malware-scanner.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Media])],
  providers: [MediaProcessor, ExifStripperService, MalwareScannerService],
  exports: [MediaProcessor],
})
export class JobsModule {}