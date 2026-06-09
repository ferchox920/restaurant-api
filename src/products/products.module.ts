import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductCostsService } from './product-costs.service';
import { ProductPricesService } from './product-prices.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductCostsService, ProductPricesService],
  exports: [ProductsService, ProductCostsService, ProductPricesService],
})
export class ProductsModule {}
