import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { Media } from '../media/media.entity';
import { MediaProcessor } from './media.processor';
import { ExifStripperService } from './exif-stripper.service';
import { MalwareScannerService } from './malware-scanner.service';
import { ZipBuilderService } from './zip.builder.service';
import { Zip } from '../zip/zip.entity';
import { RetentionPolicy } from '../rooms/retention-policy.entity';
import { NoticeBuilderService } from './notice.builder.service';
import { JobDispatcher } from './job.dispatcher';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Media, Zip, RetentionPolicy])],
  providers: [MediaProcessor, ExifStripperService, MalwareScannerService, ZipBuilderService, NoticeBuilderService, JobDispatcher],
  exports: [MediaProcessor, ZipBuilderService, NoticeBuilderService, JobDispatcher],
})
export class JobsModule {}
