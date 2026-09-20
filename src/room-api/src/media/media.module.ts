import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './media.entity';
import { Room } from '../rooms/room.entity';
import { Membership } from '../rooms/membership.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ZipService } from '../zip/zip.service';
import { Zip } from '../zip/zip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Media, Room, Membership, Zip])],
  controllers: [MediaController],
  providers: [MediaService, ZipService],
  exports: [MediaService],
})
export class MediaModule {}