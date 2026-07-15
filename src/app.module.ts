import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { PaymentBanksModule } from './payment-banks/payment-banks.module';
import { PosModule } from './pos/pos.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { SalesModule } from './sales/sales.module';
import { SalesChannelsModule } from './sales-channels/sales-channels.module';
import { TableOrdersModule } from './table-orders/table-orders.module';
import { TablesModule } from './tables/tables.module';
import { UsersModule } from './users/users.module';
import { ObservabilityInterceptor } from './common/interceptors/observability.interceptor';
import { OptionsModule } from './options/options.module';
import { OperationsModule } from './operations/operations.module';
import { PerformanceMetricsController } from './common/observability/performance-metrics.controller';
import { PerformanceMetricsService } from './common/observability/performance-metrics.service';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    AuditModule,
    HealthModule,
    InventoryModule,
    PaymentBanksModule,
    PosModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    SalesChannelsModule,
    ProductsModule,
    SalesModule,
    TablesModule,
    TableOrdersModule,
    ReportsModule,
    OptionsModule,
    OperationsModule,
  ],
  controllers: [AppController, PerformanceMetricsController],
  providers: [
    AppService,
    PerformanceMetricsService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ObservabilityInterceptor,
    },
  ],
})
export class AppModule {}
