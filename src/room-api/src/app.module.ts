import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomModule } from './rooms/room.module';
import { Room } from './rooms/room.entity';
import { Membership } from './rooms/membership.entity';
import { MediaModule } from './media/media.module';
import { Media } from './media/media.entity';
import { JobsModule } from './jobs/jobs.module';
import { Job } from './jobs/job.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 1433),
        username: config.get('DATABASE_USERNAME', 'sa'),
        password: config.get('DATABASE_PASSWORD', 'Your_password123'),
        database: config.get('DATABASE_NAME', 'room'),
        entities: [Room, Membership, Media, Job],
        synchronize: false,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      }),
    }),
    RoomModule,
    MediaModule,
    JobsModule,
  ],
})
export class AppModule {}
