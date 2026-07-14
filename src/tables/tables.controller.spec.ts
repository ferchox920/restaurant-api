import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTableDto } from './dto/create-table.dto';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

describe('TablesController roles metadata', () => {
  let controller: TablesController;

  beforeEach(() => {
    controller = new TablesController({} as TablesService);
  });

  function getRoles(methodName: keyof TablesController): string[] | undefined {
    return Reflect.getMetadata(ROLES_KEY, controller[methodName]);
  }

  it('requires JWT authentication and role checks at controller level', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, TablesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('allows all authenticated roles to read tables', () => {
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

  it('limits mutations to ADMIN and MANAGER', () => {
    expect(getRoles('create')).toEqual(['ADMIN', 'MANAGER']);
    expect(getRoles('update')).toEqual(['ADMIN', 'MANAGER']);
    expect(getRoles('deactivate')).toEqual(['ADMIN', 'MANAGER']);
    expect(getRoles('reactivate')).toEqual(['ADMIN', 'MANAGER']);
  });
});

describe('CreateTableDto validation', () => {
  it('accepts a valid table payload and trims strings', async () => {
    const dto = plainToInstance(CreateTableDto, {
      code: ' M01 ',
      name: ' Mesa 1 ',
      area: ' Salon ',
      capacity: 4,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.code).toBe('M01');
    expect(dto.name).toBe('Mesa 1');
    expect(dto.area).toBe('Salon');
  });

  it('requires code', async () => {
    const dto = plainToInstance(CreateTableDto, {
      capacity: 4,
    });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'code',
        }),
      ]),
    );
  });

  it('rejects invalid capacity', async () => {
    const dto = plainToInstance(CreateTableDto, {
      code: 'M01',
      capacity: 0,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('capacity');
  });
});
