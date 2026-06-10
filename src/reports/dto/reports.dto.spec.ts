import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  InventoryMovementType,
  InventoryReferenceType,
} from '../../inventory/inventory.enums';
import { InventoryMovementsReportQueryDto } from './inventory-movements-report-query.dto';
import { SalesByChannelQueryDto } from './sales-by-channel-query.dto';
import { StockReportQueryDto } from './stock-report-query.dto';

describe('Reports DTO validation', () => {
  it('accepts valid date ranges', () => {
    const dto = plainToInstance(SalesByChannelQueryDto, {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-10T00:00:00.000Z',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects date ranges where from is greater than to', () => {
    const dto = plainToInstance(SalesByChannelQueryDto, {
      from: '2026-06-11T00:00:00.000Z',
      to: '2026-06-10T00:00:00.000Z',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toMatchObject({
      reportDateRange: '"from" cannot be greater than "to".',
    });
  });

  it('rejects invalid UUID values in stock query', () => {
    const dto = plainToInstance(StockReportQueryDto, {
      categoryId: 'not-a-uuid',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('categoryId');
  });

  it('rejects invalid movementType values', () => {
    const dto = plainToInstance(InventoryMovementsReportQueryDto, {
      movementType: 'WRONG_TYPE',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('movementType');
  });

  it('accepts valid movementType values', () => {
    const dto = plainToInstance(InventoryMovementsReportQueryDto, {
      movementType: InventoryMovementType.SALE_OUT,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts valid referenceType values', () => {
    const dto = plainToInstance(InventoryMovementsReportQueryDto, {
      referenceType: InventoryReferenceType.SALE_TICKET,
      createdById: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
      limit: 100,
      offset: 0,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid referenceType values', () => {
    const dto = plainToInstance(InventoryMovementsReportQueryDto, {
      referenceType: 'WRONG_REFERENCE',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('referenceType');
  });

  it('rejects invalid createdById values', () => {
    const dto = plainToInstance(InventoryMovementsReportQueryDto, {
      createdById: 'not-a-uuid',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('createdById');
  });

  it('rejects limit above 100', () => {
    const dto = plainToInstance(InventoryMovementsReportQueryDto, {
      limit: 101,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('limit');
  });

  it('rejects negative offset', () => {
    const dto = plainToInstance(InventoryMovementsReportQueryDto, {
      offset: -1,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('offset');
  });
});
