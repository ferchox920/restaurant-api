import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaService: {
    category: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      category: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new CategoriesService(prismaService as unknown as PrismaService);
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
});
