import { DataSource } from 'typeorm';
import { Room } from './rooms/room.entity';
import { Membership } from './rooms/membership.entity';
import { Payment } from './rooms/payment.entity';
import { Media } from './media/media.entity';
import { Job } from './jobs/job.entity';
import { ContentReport } from './content/content.entity';
import { Zip } from './zip/zip.entity';

export default new DataSource({
  type: 'mssql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 1433,
  username: process.env.DATABASE_USERNAME || 'sa',
  password: process.env.DATABASE_PASSWORD || 'Your_password123',
  database: process.env.DATABASE_NAME || 'room',
  entities: [Room, Membership, Payment, Media, Job, ContentReport, Zip],
  migrations: ['src/migrations/*.ts'],
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});
