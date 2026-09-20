import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Room } from './room.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'varchar', length: 50 })
  package: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  period: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  providerRef: string | null;

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
