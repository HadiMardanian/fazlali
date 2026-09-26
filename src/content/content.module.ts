import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentReport } from './content.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContentReport])],
  providers: [],
  exports: [TypeOrmModule],
})
export class ContentModule {}
