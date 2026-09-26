import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zip } from './zip.entity';
import { Room } from '../rooms/room.entity';
import { Job } from '../jobs/job.entity';
import { ZipService } from './zip.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Zip, Room, Job]), AuditModule],
  providers: [ZipService],
  exports: [ZipService],
})
export class ZipModule {}
