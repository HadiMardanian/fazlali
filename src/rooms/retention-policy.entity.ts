import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Room } from './room.entity';

@Entity('retention_policies')
export class RetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'timestamp' })
  expiryAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  graceUntil: Date | null;

  @Column({ type: 'boolean', default: false })
  notified7d: boolean;

  @Column({ type: 'boolean', default: false })
  notified3d: boolean;

  @Column({ type: 'boolean', default: false })
  notified1d: boolean;

  @Column({ type: 'varchar', length: 20, default: 'delete' })
  action: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
