import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CancelTableOrderDto } from './dto/cancel-table-order.dto';
import { OpenTableOrderDto } from './dto/open-table-order.dto';
import { TableOrdersController } from './table-orders.controller';
import { TableOrdersService } from './table-orders.service';

describe('TableOrdersController roles metadata', () => {
  let controller: TableOrdersController;

  beforeEach(() => {
    controller = new TableOrdersController({} as TableOrdersService);
  });

  function getRoles(
    methodName: keyof TableOrdersController,
  ): string[] | undefined {
    return Reflect.getMetadata(ROLES_KEY, controller[methodName]);
  }

  it('requires JWT authentication and role checks at controller level', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, TableOrdersController)).toEqual(
      [JwtAuthGuard, RolesGuard],
    );
  });

  it('allows all authenticated roles to read table orders', () => {
    expect(getRoles('findAll')).toEqual([
      'ADMIN',
      'MANAGER',
      'CASHIER',
      'AUDITOR',
    ]);
    expect(getRoles('findCurrentByTable')).toEqual([
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

  it('allows ADMIN, MANAGER and CASHIER to mutate open orders', () => {
    expect(getRoles('open')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('cancel')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('addItem')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('updateItem')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('removeItem')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
    expect(getRoles('close')).toEqual(['ADMIN', 'MANAGER', 'CASHIER']);
  });
});

describe('Table order DTO validation', () => {
  it('requires salesChannelId when opening an order', async () => {
    const dto = plainToInstance(OpenTableOrderDto, {
      notes: 'Mesa 1',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('salesChannelId');
  });

  it('accepts a valid open order payload', async () => {
    const dto = plainToInstance(OpenTableOrderDto, {
      salesChannelId: '550e8400-e29b-41d4-a716-446655440000',
      notes: ' Mesa 1 ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.notes).toBe('Mesa 1');
  });

  it('requires a non-empty cancellation reason', async () => {
    const dto = plainToInstance(CancelTableOrderDto, {
      reason: '   ',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('reason');
  });
});
