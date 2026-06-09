import { Decimal } from '@prisma/client/runtime/library';
import { StockManagementType } from '../../products/product.enums';
import { toInventoryStockResponse } from './inventory-stock-response.mapper';

describe('toInventoryStockResponse', () => {
  it('serializes decimals as strings and resolves AVAILABLE', () => {
    const result = toInventoryStockResponse({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T03:00:00.000Z'),
      stock: {
        currentStock: new Decimal('12.50'),
        minimumStock: new Decimal('10.00'),
        updatedAt: new Date('2026-06-09T04:00:00.000Z'),
      },
    });

    expect(result).toMatchObject({
      currentStock: '12.5',
      minimumStock: '10',
      stockStatus: 'AVAILABLE',
    });
    expect(result.updatedAt.toISOString()).toBe('2026-06-09T04:00:00.000Z');
  });

  it('falls back to zero stock when ProductStock does not exist', () => {
    const result = toInventoryStockResponse({
      id: 'product-2',
      name: 'Papas fritas',
      sku: null,
      unit: 'PORTION',
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T03:00:00.000Z'),
      stock: null,
    });

    expect(result.currentStock).toBe('0');
    expect(result.minimumStock).toBe('0');
    expect(result.stockStatus).toBe('OUT_OF_STOCK');
  });

  it('resolves LOW_STOCK when currentStock is above 0 and below or equal minimumStock', () => {
    const result = toInventoryStockResponse({
      id: 'product-3',
      name: 'Empanada',
      sku: 'EMP-001',
      unit: 'UNIT',
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T03:00:00.000Z'),
      stock: {
        currentStock: new Decimal('3'),
        minimumStock: new Decimal('5'),
        updatedAt: new Date('2026-06-09T04:00:00.000Z'),
      },
    });

    expect(result.stockStatus).toBe('LOW_STOCK');
  });
});
