import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { Media } from '../media/media.entity';
import { MediaProcessor } from './media.processor';
import { ExifStripperService } from './exif-stripper.service';
import { MalwareScannerService } from './malware-scanner.service';
import { ZipBuilderService } from './zip.builder.service';
import { Zip } from '../zip/zip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Media, Zip])],
  providers: [MediaProcessor, ExifStripperService, MalwareScannerService, ZipBuilderService],
  exports: [MediaProcessor, ZipBuilderService],
})
export class JobsModule {}