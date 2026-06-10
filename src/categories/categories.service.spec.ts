import { ConflictException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaService: {
    $transaction: jest.Mock;
    category: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditService: {
    log: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
      category: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new CategoriesService(
      prismaService as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  it('creates a category', async () => {
    prismaService.category.findUnique.mockResolvedValueOnce(null);
    prismaService.category.create.mockResolvedValueOnce({
      id: 'category-1',
      name: 'Hamburguesas',
      description: 'Linea principal',
      active: true,
      createdById: 'admin-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.create(
      {
        name: 'Hamburguesas',
        description: 'Linea principal',
      },
      'admin-1',
    );

    expect(prismaService.category.create).toHaveBeenCalledWith({
      data: {
        name: 'Hamburguesas',
        description: 'Linea principal',
        createdById: 'admin-1',
      },
    });
    expect(result.name).toBe('Hamburguesas');
    expect(result.active).toBe(true);
  });

  it('does not allow duplicate category name', async () => {
    prismaService.category.findUnique.mockResolvedValueOnce({ id: 'existing' });

    await expect(
      service.create(
        {
          name: 'Hamburguesas',
          description: 'Duplicada',
        },
        'admin-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('lists categories', async () => {
    prismaService.category.findMany.mockResolvedValueOnce([
      {
        id: 'category-1',
        name: 'Bebidas',
        description: null,
        active: true,
        createdById: 'admin-1',
        createdAt: new Date('2026-06-09T00:00:00.000Z'),
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
      },
    ]);

    const result = await service.findAll();

    expect(prismaService.category.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { name: 'asc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bebidas');
  });

  it('gets a category by id', async () => {
    prismaService.category.findUnique.mockResolvedValueOnce({
      id: 'category-1',
      name: 'Postres',
      description: 'Dulces',
      active: true,
      createdById: 'admin-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.findOne('category-1');

    expect(result.id).toBe('category-1');
    expect(result.name).toBe('Postres');
  });

  it('updates a category', async () => {
    prismaService.category.findUnique
      .mockResolvedValueOnce({ id: 'category-1' })
      .mockResolvedValueOnce(null);
    prismaService.category.update.mockResolvedValueOnce({
      id: 'category-1',
      name: 'Promociones',
      description: 'Combos y ofertas',
      active: true,
      createdById: 'admin-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.update('category-1', {
      name: 'Promociones',
      description: 'Combos y ofertas',
    });

    expect(prismaService.category.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: {
        name: 'Promociones',
        description: 'Combos y ofertas',
      },
    });
    expect(result.description).toBe('Combos y ofertas');
  });

  it('deactivates a category', async () => {
    prismaService.category.update.mockResolvedValueOnce({
      id: 'category-1',
      name: 'Papas',
      description: null,
      active: false,
      createdById: 'admin-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.deactivate('category-1');

    expect(prismaService.category.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { active: false },
    });
    expect(result.active).toBe(false);
  });

  it('reactivates a category', async () => {
    prismaService.category.update.mockResolvedValueOnce({
      id: 'category-1',
      name: 'Papas',
      description: null,
      active: true,
      createdById: 'admin-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.reactivate('category-1');

    expect(prismaService.category.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { active: true },
    });
    expect(result.active).toBe(true);
  });

  it('lists categories with active filter without error', async () => {
    prismaService.category.findMany.mockResolvedValueOnce([]);

    const result = await service.findAll(true);

    expect(prismaService.category.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual([]);
  });

  it('creates an audit log when creating a category', async () => {
    prismaService.category.findUnique.mockResolvedValueOnce(null);
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(prismaService),
    );
    prismaService.category.create.mockResolvedValueOnce({
      id: 'category-1',
      name: 'Hamburguesas',
      description: 'Linea principal',
      active: true,
      createdById: 'admin-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    await service.create(
      {
        name: 'Hamburguesas',
        description: 'Linea principal',
      },
      'admin-1',
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        entityId: 'category-1',
        beforeData: null,
        afterData: expect.objectContaining({
          name: 'Hamburguesas',
        }),
      }),
      prismaService,
    );
  });

  it('writes before and after snapshots when updating a category', async () => {
    prismaService.category.findUnique
      .mockResolvedValueOnce({
        id: 'category-1',
        name: 'Old',
        description: 'Before',
        active: true,
        createdById: 'admin-1',
        createdAt: new Date('2026-06-09T00:00:00.000Z'),
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
      })
      .mockResolvedValueOnce(null);
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(prismaService),
    );
    prismaService.category.update.mockResolvedValueOnce({
      id: 'category-1',
      name: 'New',
      description: 'After',
      active: true,
      createdById: 'admin-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-10T00:00:00.000Z'),
    });

    await service.update(
      'category-1',
      { name: 'New', description: 'After' },
      'manager-1',
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'manager-1',
        beforeData: expect.objectContaining({ name: 'Old' }),
        afterData: expect.objectContaining({ name: 'New' }),
      }),
      prismaService,
    );
  });
});
