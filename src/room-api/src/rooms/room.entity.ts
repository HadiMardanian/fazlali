import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoomMode } from './room-mode.enum';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @Column()
  title: string;

  @Column({ type: 'datetime', nullable: true })
  eventDate: Date | null;

  @Column({ type: 'int', nullable: true })
  guestCapacity: number | null;

  @Column({ type: 'varchar', length: 20, default: RoomMode.PRIVATE })
  mode: RoomMode;

  @Column({ type: 'varchar', length: 50, nullable: true })
  package: string | null;

  @Column({ type: 'datetime', nullable: true })
  retentionUntil: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  inviteLink: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pinHash: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  branding: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
