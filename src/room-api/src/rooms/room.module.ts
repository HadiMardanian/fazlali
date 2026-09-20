import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './room.entity';
import { Membership } from './membership.entity';
import { Payment } from './payment.entity';
import { RetentionPolicy } from './retention-policy.entity';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { RetentionService } from './retention.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Membership, Payment, RetentionPolicy])],
  controllers: [RoomController],
  providers: [RoomService, RetentionService],
  exports: [RoomService, RetentionService],
})
export class RoomModule {}
