import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { TablesService } from './tables.service';

describe('TablesService', () => {
  let service: TablesService;
  let prismaService: {
    $transaction: jest.Mock;
    restaurantTable: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditService: {
    log: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
      restaurantTable: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    service = new TablesService(
      prismaService as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  function makeTable(overrides: Record<string, unknown> = {}) {
    return {
      id: 'table-1',
      code: 'M01',
      name: 'Mesa 1',
      area: 'Salon',
      capacity: 4,
      active: true,
      createdById: 'admin-1',
      createdAt: new Date('2026-06-29T22:00:00.000Z'),
      updatedAt: new Date('2026-06-29T22:00:00.000Z'),
      ...overrides,
    };
  }

  it('creates a table and writes an audit log', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce(null);
    prismaService.restaurantTable.create.mockResolvedValueOnce(makeTable());

    const result = await service.create(
      {
        code: 'M01',
        name: 'Mesa 1',
        area: 'Salon',
        capacity: 4,
      },
      'admin-1',
    );

    expect(prismaService.restaurantTable.create).toHaveBeenCalledWith({
      data: {
        code: 'M01',
        name: 'Mesa 1',
        area: 'Salon',
        capacity: 4,
        createdById: 'admin-1',
      },
      include: expect.any(Object),
    });
    expect(result.status).toBe('AVAILABLE');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        action: AuditAction.RESTAURANT_TABLE_CREATED,
        entityType: AuditEntityType.RESTAURANT_TABLE,
        entityId: 'table-1',
        beforeData: null,
      }),
      expect.anything(),
    );
  });

  it('rejects duplicate table codes', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce({
      id: 'table-1',
    });

    await expect(service.create({ code: 'M01' }, 'admin-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('lists tables with active, area and search filters', async () => {
    prismaService.restaurantTable.findMany.mockResolvedValueOnce([makeTable()]);

    const result = await service.findAll({
      active: true,
      area: 'Salon',
      search: 'M',
    });

    expect(prismaService.restaurantTable.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        area: {
          equals: 'Salon',
          mode: 'insensitive',
        },
        OR: [
          { code: { contains: 'M', mode: 'insensitive' } },
          { name: { contains: 'M', mode: 'insensitive' } },
          { area: { contains: 'M', mode: 'insensitive' } },
        ],
      },
      include: expect.any(Object),
      orderBy: { code: 'asc' },
    });
    expect(result).toHaveLength(1);
  });

  it('gets a table by id', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce(makeTable());

    const result = await service.findOne('table-1');

    expect(result.id).toBe('table-1');
    expect(result.code).toBe('M01');
  });

  it('throws not found for missing tables', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing-table')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates a table and writes before and after audit snapshots', async () => {
    prismaService.restaurantTable.findUnique
      .mockResolvedValueOnce(makeTable())
      .mockResolvedValueOnce(null);
    prismaService.restaurantTable.update.mockResolvedValueOnce(
      makeTable({ name: 'Mesa principal', capacity: 6 }),
    );

    const result = await service.update(
      'table-1',
      {
        name: 'Mesa principal',
        capacity: 6,
      },
      'manager-1',
    );

    expect(result.name).toBe('Mesa principal');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'manager-1',
        action: AuditAction.RESTAURANT_TABLE_UPDATED,
        beforeData: expect.objectContaining({ name: 'Mesa 1' }),
        afterData: expect.objectContaining({ name: 'Mesa principal' }),
      }),
      expect.anything(),
    );
  });

  it('deactivates without deleting the table', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce(makeTable());
    prismaService.restaurantTable.update.mockResolvedValueOnce(
      makeTable({ active: false }),
    );

    const result = await service.deactivate('table-1', 'manager-1');

    expect(prismaService.restaurantTable.update).toHaveBeenCalledWith({
      where: { id: 'table-1' },
      data: { active: false },
      include: expect.any(Object),
    });
    expect(result.status).toBe('INACTIVE');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.RESTAURANT_TABLE_DEACTIVATED,
      }),
      expect.anything(),
    );
  });

  it('reactivates a table', async () => {
    prismaService.restaurantTable.findUnique.mockResolvedValueOnce(
      makeTable({ active: false }),
    );
    prismaService.restaurantTable.update.mockResolvedValueOnce(makeTable());

    const result = await service.reactivate('table-1', 'manager-1');

    expect(prismaService.restaurantTable.update).toHaveBeenCalledWith({
      where: { id: 'table-1' },
      data: { active: true },
      include: expect.any(Object),
    });
    expect(result.status).toBe('AVAILABLE');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.RESTAURANT_TABLE_REACTIVATED,
      }),
      expect.anything(),
    );
  });
});
