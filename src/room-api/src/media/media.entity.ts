import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Room } from '../rooms/room.entity';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'varchar', length: 255 })
  uploaderRef: string;

  @Column({ type: 'varchar', length: 10 })
  kind: string;

  @Column({ type: 'varchar', length: 500 })
  originalKey: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbKey: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  webKey: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  multipartUploadId: string | null;

  @Column({ type: 'int', nullable: true })
  totalParts: number | null;

  @Column({ type: 'datetime', nullable: true })
  uploadStartedAt: Date | null;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'varchar', length: 100 })
  mime: string;

  @Column({ type: 'varchar', length: 20, default: 'temp' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}