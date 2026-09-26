import { DataSource } from 'typeorm';
import { Room } from './rooms/room.entity';
import { Membership } from './rooms/membership.entity';
import { Payment } from './rooms/payment.entity';
import { RetentionPolicy } from './rooms/retention-policy.entity';
import { Media } from './media/media.entity';
import { Job } from './jobs/job.entity';
import { ContentReport } from './content/content.entity';
import { Zip } from './zip/zip.entity';
import { AuditLog } from './audit/audit.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'room',
  entities: [Room, Membership, Payment, RetentionPolicy, Media, Job, ContentReport, Zip, AuditLog],
  migrations: ['src/migrations/*.ts'],
});
