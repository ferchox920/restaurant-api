import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController roles metadata', () => {
  let controller: InventoryController;

  beforeEach(() => {
    controller = new InventoryController({} as InventoryService);
  });

  function getRoles(
    methodName: keyof InventoryController,
  ): string[] | undefined {
    return Reflect.getMetadata(ROLES_KEY, controller[methodName]);
  }

  it('allows ADMIN, MANAGER, CASHIER and AUDITOR to read inventory', () => {
    expect(getRoles('getInventory')).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
    expect(getRoles('getProductInventory')).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
  });

  it('allows ADMIN, MANAGER and AUDITOR to read movements', () => {
    expect(getRoles('getMovements')).toEqual([
      'ADMIN',
      'MANAGER',
      'AUDITOR',
    ]);
    expect(getRoles('getProductMovements')).toEqual([
      'ADMIN',
      'MANAGER',
      'AUDITOR',
    ]);
  });

  it('allows only ADMIN and MANAGER to mutate stock', () => {
    expect(getRoles('stockIn')).toEqual(['ADMIN', 'MANAGER']);
    expect(getRoles('manualAdjust')).toEqual(['ADMIN', 'MANAGER']);
    expect(getRoles('registerWaste')).toEqual(['ADMIN', 'MANAGER']);
    expect(getRoles('returnIn')).toEqual(['ADMIN', 'MANAGER']);
    expect(getRoles('updateMinimumStock')).toEqual(['ADMIN', 'MANAGER']);
  });
});
