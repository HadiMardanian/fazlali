import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zip } from './zip.entity';
import { ZipService } from './zip.service';

@Module({
  imports: [TypeOrmModule.forFeature([Zip])],
  providers: [ZipService],
  exports: [ZipService],
})
export class ZipModule {}
