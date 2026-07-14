import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { SalesModule } from '../sales/sales.module';
import { TableOrdersController } from './table-orders.controller';
import { TableOrdersService } from './table-orders.service';

@Module({
  imports: [AuditModule, DatabaseModule, SalesModule],
  controllers: [TableOrdersController],
  providers: [TableOrdersService],
})
export class TableOrdersModule {}
