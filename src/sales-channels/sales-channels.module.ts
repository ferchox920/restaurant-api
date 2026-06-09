import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SalesChannelsController } from './sales-channels.controller';
import { SalesChannelsService } from './sales-channels.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SalesChannelsController],
  providers: [SalesChannelsService],
  exports: [SalesChannelsService],
})
export class SalesChannelsModule {}
