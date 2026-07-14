import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { PaymentBanksController } from './payment-banks.controller';
import { PaymentBanksService } from './payment-banks.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [PaymentBanksController],
  providers: [PaymentBanksService],
  exports: [PaymentBanksService],
})
export class PaymentBanksModule {}
