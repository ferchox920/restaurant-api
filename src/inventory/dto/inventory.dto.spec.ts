import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ManualAdjustmentDto } from './manual-adjustment.dto';
import { ReturnInDto } from './return-in.dto';
import { StockInDto } from './stock-in.dto';
import { UpdateMinimumStockDto } from './update-minimum-stock.dto';
import { WasteDto } from './waste.dto';

describe('Sprint 5 inventory DTOs', () => {
  it('accepts stock in payload with quantity greater than 0', () => {
    const dto = plainToInstance(StockInDto, {
      quantity: 2.5,
      reason: 'Produccion terminada.',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects stock in payload with quantity 0', () => {
    const dto = plainToInstance(StockInDto, {
      quantity: 0,
      reason: 'Produccion terminada.',
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.min).toBeDefined();
  });

  it('accepts manual adjustment with target stock 0', () => {
    const dto = plainToInstance(ManualAdjustmentDto, {
      newStock: 0,
      reason: 'Conteo fisico.',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects manual adjustment with negative newStock', () => {
    const dto = plainToInstance(ManualAdjustmentDto, {
      newStock: -1,
      reason: 'Conteo fisico.',
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.min).toBeDefined();
  });

  it('rejects waste payload without reason', () => {
    const dto = plainToInstance(WasteDto, {
      quantity: 1,
      reason: '',
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.isNotEmpty).toBeDefined();
  });

  it('accepts return in payload with quantity greater than 0', () => {
    const dto = plainToInstance(ReturnInDto, {
      quantity: 1,
      reason: 'Reingreso manual.',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts minimum stock 0', () => {
    const dto = plainToInstance(UpdateMinimumStockDto, {
      minimumStock: 0,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects negative minimum stock', () => {
    const dto = plainToInstance(UpdateMinimumStockDto, {
      minimumStock: -0.01,
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.min).toBeDefined();
  });
});
