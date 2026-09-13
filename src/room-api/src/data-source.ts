import { DataSource } from 'typeorm';
import { Room } from './rooms/room.entity';
import { Membership } from './rooms/membership.entity';
import { Media } from './media/media.entity';
import { Job } from './jobs/job.entity';

export default new DataSource({
  type: 'mssql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 1433,
  username: process.env.DATABASE_USERNAME || 'sa',
  password: process.env.DATABASE_PASSWORD || 'Your_password123',
  database: process.env.DATABASE_NAME || 'room',
  entities: [Room, Membership, Media, Job],
  migrations: ['src/migrations/*.ts'],
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});
