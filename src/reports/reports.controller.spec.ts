import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController roles metadata', () => {
  let controller: ReportsController;

  beforeEach(() => {
    controller = new ReportsController({} as ReportsService);
  });

  function getRoles(methodName: keyof ReportsController): string[] | undefined {
    return Reflect.getMetadata(ROLES_KEY, controller[methodName]);
  }

  it('allows ADMIN, MANAGER and AUDITOR to read all report endpoints', () => {
    expect(getRoles('getStockReport')).toEqual(['ADMIN', 'MANAGER', 'AUDITOR']);
    expect(getRoles('getSalesByChannelReport')).toEqual([
      'ADMIN',
      'MANAGER',
      'AUDITOR',
    ]);
    expect(getRoles('getSalesByProductReport')).toEqual([
      'ADMIN',
      'MANAGER',
      'AUDITOR',
    ]);
    expect(getRoles('getSalesByUserReport')).toEqual([
      'ADMIN',
      'MANAGER',
      'AUDITOR',
    ]);
    expect(getRoles('getInventoryMovementsReport')).toEqual([
      'ADMIN',
      'MANAGER',
      'AUDITOR',
    ]);
  });

  it('does not allow CASHIER in any report endpoint metadata', () => {
    const methodNames: Array<keyof ReportsController> = [
      'getStockReport',
      'getSalesByChannelReport',
      'getSalesByProductReport',
      'getSalesByUserReport',
      'getInventoryMovementsReport',
    ];

    for (const methodName of methodNames) {
      expect(getRoles(methodName)).not.toContain('CASHIER');
    }
  });

  it('applies JwtAuthGuard and RolesGuard at controller level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ReportsController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });
});
