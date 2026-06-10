import { Decimal } from '@prisma/client/runtime/library';
import { StockManagementType } from '../../products/product.enums';
import { StockReportResponseDto } from '../dto/stock-report-response.dto';
import { ReportStockStatus } from '../reports.enums';
import { toDecimalString, zeroDecimal } from './report-decimal.mapper';

export type StockReportRecord = {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  unit: string;
  stockManagementType: StockManagementType;
  active: boolean;
  updatedAt: Date;
  category?: {
    name: string;
  } | null;
  stock?: {
    currentStock: Decimal;
    minimumStock: Decimal;
    updatedAt: Date;
  } | null;
};

export function toStockReportResponse(
  product: StockReportRecord,
): StockReportResponseDto {
  const currentStock = product.stock?.currentStock ?? zeroDecimal();
  const minimumStock = product.stock?.minimumStock ?? zeroDecimal();

  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    unit: product.unit,
    stockManagementType: product.stockManagementType,
    active: product.active,
    currentStock: toDecimalString(currentStock),
    minimumStock: toDecimalString(minimumStock),
    stockStatus: resolveStockStatus(
      product.stockManagementType,
      currentStock,
      minimumStock,
    ),
    updatedAt: product.stock?.updatedAt ?? product.updatedAt,
  };
}

function resolveStockStatus(
  stockManagementType: StockManagementType,
  currentStock: Decimal,
  minimumStock: Decimal,
): string {
  if (stockManagementType !== StockManagementType.FINISHED_PRODUCT) {
    return ReportStockStatus.NOT_TRACKED;
  }

  if (currentStock.eq(0)) {
    return ReportStockStatus.OUT_OF_STOCK;
  }

  if (currentStock.lte(minimumStock)) {
    return ReportStockStatus.LOW_STOCK;
  }

  return ReportStockStatus.AVAILABLE;
}
