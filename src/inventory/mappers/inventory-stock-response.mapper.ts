import { Decimal } from '@prisma/client/runtime/library';
import { StockManagementType } from '../../products/product.enums';
import { InventoryStockResponseDto } from '../dto/inventory-stock-response.dto';
import { InventoryStockStatus } from '../inventory.enums';

export type InventoryStockRecord = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  stockManagementType: StockManagementType;
  updatedAt: Date;
  stock?: {
    currentStock: Decimal;
    minimumStock: Decimal;
    updatedAt: Date;
  } | null;
};

export function toInventoryStockResponse(
  product: InventoryStockRecord,
): InventoryStockResponseDto {
  const currentStock = product.stock?.currentStock ?? new Decimal(0);
  const minimumStock = product.stock?.minimumStock ?? new Decimal(0);

  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    unit: product.unit,
    stockManagementType: product.stockManagementType,
    currentStock: currentStock.toString(),
    minimumStock: minimumStock.toString(),
    stockStatus: resolveStockStatus(currentStock, minimumStock),
    updatedAt: product.stock?.updatedAt ?? product.updatedAt,
  };
}

function resolveStockStatus(
  currentStock: Decimal,
  minimumStock: Decimal,
): string {
  if (currentStock.eq(0)) {
    return InventoryStockStatus.OUT_OF_STOCK;
  }

  if (currentStock.lte(minimumStock)) {
    return InventoryStockStatus.LOW_STOCK;
  }

  return InventoryStockStatus.AVAILABLE;
}
