import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateProductCostDto } from './create-product-cost.dto';
import { CreateProductPriceDto } from './create-product-price.dto';

describe('cost and price DTOs', () => {
  it('accepts cost 0', () => {
    const dto = plainToInstance(CreateProductCostDto, { cost: 0 });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects negative cost', () => {
    const dto = plainToInstance(CreateProductCostDto, { cost: -1 });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.min).toBeDefined();
  });

  it('accepts price 0 with valid salesChannelId', () => {
    const dto = plainToInstance(CreateProductPriceDto, {
      salesChannelId: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
      price: 0,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid salesChannelId', () => {
    const dto = plainToInstance(CreateProductPriceDto, {
      salesChannelId: 'not-a-uuid',
      price: 10,
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.isUuid).toBeDefined();
  });

  it('rejects negative price', () => {
    const dto = plainToInstance(CreateProductPriceDto, {
      salesChannelId: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
      price: -10,
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.min).toBeDefined();
  });
});
