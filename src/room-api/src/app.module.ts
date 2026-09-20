import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomModule } from './rooms/room.module';
import { Room } from './rooms/room.entity';
import { Membership } from './rooms/membership.entity';
import { Payment } from './rooms/payment.entity';
import { MediaModule } from './media/media.module';
import { Media } from './media/media.entity';
import { JobsModule } from './jobs/jobs.module';
import { Job } from './jobs/job.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { ContentModule } from './content/content.module';
import { ContentReport } from './content/content.entity';
import { ZipModule } from './zip/zip.module';
import { Zip } from './zip/zip.entity';

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
        entities: [Room, Membership, Payment, Media, Job, ContentReport, Zip],
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
    ContentModule,
    ZipModule,
  ],
})
export class AppModule {}
