import { Decimal } from '@prisma/client/runtime/library';
import { StockManagementType } from '../../products/product.enums';
import { toStockReportResponse } from './stock-report.mapper';

describe('toStockReportResponse', () => {
  it('returns zero stock values when ProductStock is missing', () => {
    const result = toStockReportResponse({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      categoryId: null,
      unit: 'UNIT',
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      active: true,
      updatedAt: new Date('2026-06-10T00:00:00.000Z'),
      category: null,
      stock: null,
    });

    expect(result.currentStock).toBe('0');
    expect(result.minimumStock).toBe('0');
    expect(result.stockStatus).toBe('OUT_OF_STOCK');
  });

  it('marks NON_STOCKED and RECIPE_BASED products as NOT_TRACKED', () => {
    const nonStocked = toStockReportResponse({
      id: 'product-2',
      name: 'Servicio de mesa',
      sku: null,
      categoryId: null,
      unit: 'SERVICE',
      stockManagementType: StockManagementType.NON_STOCKED,
      active: true,
      updatedAt: new Date('2026-06-10T00:00:00.000Z'),
      category: null,
      stock: null,
    });

    const recipeBased = toStockReportResponse({
      id: 'product-3',
      name: 'Pizza especial',
      sku: 'PIZZA-001',
      categoryId: null,
      unit: 'UNIT',
      stockManagementType: StockManagementType.RECIPE_BASED,
      active: true,
      updatedAt: new Date('2026-06-10T00:00:00.000Z'),
      category: null,
      stock: {
        currentStock: new Decimal('10'),
        minimumStock: new Decimal('2'),
        updatedAt: new Date('2026-06-10T01:00:00.000Z'),
      },
    });

    expect(nonStocked.stockStatus).toBe('NOT_TRACKED');
    expect(recipeBased.stockStatus).toBe('NOT_TRACKED');
  });
});
