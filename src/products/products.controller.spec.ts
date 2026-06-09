import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ProductCostsService } from './product-costs.service';
import { ProductPricesService } from './product-prices.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController roles metadata', () => {
  let controller: ProductsController;

  beforeEach(() => {
    controller = new ProductsController(
      {} as ProductsService,
      {} as ProductCostsService,
      {} as ProductPricesService,
    );
  });

  function getRoles(
    methodName: keyof ProductsController,
  ): string[] | undefined {
    return Reflect.getMetadata(ROLES_KEY, controller[methodName]);
  }

  it('does not allow CASHIER to create or view costs', () => {
    expect(getRoles('createCost')).toEqual(['ADMIN', 'MANAGER']);
    expect(getRoles('findCostHistory')).toEqual([
      'ADMIN',
      'MANAGER',
      'AUDITOR',
    ]);
    expect(getRoles('findCurrentCost')).toEqual([
      'ADMIN',
      'MANAGER',
      'AUDITOR',
    ]);
  });

  it('allows CASHIER to consult current price but not create prices', () => {
    expect(getRoles('createPrice')).toEqual(['ADMIN', 'MANAGER']);
    expect(getRoles('findPriceHistory')).toEqual([
      'ADMIN',
      'MANAGER',
      'AUDITOR',
    ]);
    expect(getRoles('findCurrentPrice')).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
  });
});
