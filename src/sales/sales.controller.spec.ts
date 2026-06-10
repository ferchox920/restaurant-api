import { PATH_METADATA } from '@nestjs/common/constants';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

describe('SalesController roles metadata', () => {
  let controller: SalesController;

  beforeEach(() => {
    controller = new SalesController({} as SalesService);
  });

  it('uses the /sales/tickets route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SalesController)).toBe(
      'sales/tickets',
    );
  });

  it('requires JWT and role guards on every endpoint via class metadata', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, SalesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  function getRoles(methodName: keyof SalesController): string[] | undefined {
    return Reflect.getMetadata(ROLES_KEY, controller[methodName]);
  }

  it('allows ADMIN, MANAGER and CASHIER to mutate tickets', () => {
    expect(getRoles('create')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('update')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('addItem')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('updateItem')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('removeItem')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('cancel')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('confirm')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('void')).toEqual(['ADMIN', 'MANAGER']);
  });

  it('does not allow AUDITOR to confirm and does not allow CASHIER or AUDITOR to void', () => {
    expect(getRoles('confirm')).not.toContain('AUDITOR');
    expect(getRoles('void')).not.toContain('CASHIER');
    expect(getRoles('void')).not.toContain('AUDITOR');
  });

  it('allows ADMIN, MANAGER, CASHIER and AUDITOR to read tickets', () => {
    expect(getRoles('findAll')).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
    expect(getRoles('findOne')).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
  });
});
