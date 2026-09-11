import { DataSource } from 'typeorm';
import { Room } from './rooms/room.entity';

export default new DataSource({
  type: 'mssql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 1433,
  username: process.env.DATABASE_USERNAME || 'sa',
  password: process.env.DATABASE_PASSWORD || 'Your_password123',
  database: process.env.DATABASE_NAME || 'room',
  entities: [Room],
  migrations: ['src/migrations/*.ts'],
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});
