import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(roomId: string, actor: string, action: string, target: string | null): Promise<void> {
    const entry = this.auditRepo.create({ roomId, actor, action, target });
    await this.auditRepo.save(entry);
  }
}
