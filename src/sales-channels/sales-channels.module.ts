import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { SalesChannelsController } from './sales-channels.controller';
import { SalesChannelsService } from './sales-channels.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [SalesChannelsController],
  providers: [SalesChannelsService],
  exports: [SalesChannelsService],
})
export class SalesChannelsModule {}
