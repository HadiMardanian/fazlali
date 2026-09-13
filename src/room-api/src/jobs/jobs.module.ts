import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { Media } from '../media/media.entity';
import { MediaProcessor } from './media.processor';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Media])],
  providers: [MediaProcessor],
  exports: [MediaProcessor],
})
export class JobsModule {}