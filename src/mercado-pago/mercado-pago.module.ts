import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SalesModule } from '../sales/sales.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { MercadoPagoClient } from './mercado-pago.client';
import { MercadoPagoController } from './mercado-pago.controller';
import { MercadoPagoOrderPreviewController } from './mercado-pago-order-preview.controller';
import { MercadoPagoOrderPreviewService } from './mercado-pago-order-preview.service';
import { MercadoPagoService } from './mercado-pago.service';
import { MercadoPagoOrdersController } from './mercado-pago-orders.controller';
import { MercadoPagoOrdersService } from './mercado-pago-orders.service';
import { MercadoPagoWebhookController } from './mercado-pago-webhook.controller';
import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';

@Module({
  imports: [DatabaseModule, SalesModule, IdempotencyModule],
  controllers: [
    MercadoPagoController,
    MercadoPagoOrderPreviewController,
    MercadoPagoOrdersController,
    MercadoPagoWebhookController,
  ],
  providers: [
    MercadoPagoClient,
    MercadoPagoService,
    MercadoPagoOrderPreviewService,
    MercadoPagoOrdersService,
    MercadoPagoWebhookService,
  ],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
