import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProductUnit, StockManagementType } from './product.enums';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: {
    product: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    category: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      product: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
    };

    service = new ProductsService(prismaService as unknown as PrismaService);
  });

  it('creates a product without stock', async () => {
    prismaService.product.create.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      description: null,
      sku: null,
      categoryId: null,
      unit: ProductUnit.UNIT,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      active: true,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.create(
      {
        name: 'Hamburguesa clasica',
        unit: ProductUnit.UNIT,
      },
      'manager-1',
    );

    expect(prismaService.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Hamburguesa clasica',
        description: null,
        sku: null,
        categoryId: null,
        unit: ProductUnit.UNIT,
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        createdById: 'manager-1',
      },
    });
    expect(result.stockManagementType).toBe(
      StockManagementType.FINISHED_PRODUCT,
    );
  });

  it('creates a product with a valid categoryId', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce(null);
    prismaService.category.findUnique.mockResolvedValueOnce({
      id: 'category-1',
      active: true,
    });
    prismaService.product.create.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Papas fritas',
      description: null,
      sku: 'PAP-001',
      categoryId: 'category-1',
      unit: ProductUnit.PORTION,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      active: true,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.create(
      {
        name: 'Papas fritas',
        sku: 'PAP-001',
        categoryId: 'category-1',
        unit: ProductUnit.PORTION,
      },
      'manager-1',
    );

    expect(prismaService.category.findUnique).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      select: {
        id: true,
        active: true,
      },
    });
    expect(result.categoryId).toBe('category-1');
  });

  it('rejects nonexistent categoryId', async () => {
    prismaService.category.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          name: 'Papas fritas',
          categoryId: 'missing-category',
          unit: ProductUnit.PORTION,
        },
        'manager-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects inactive categoryId', async () => {
    prismaService.category.findUnique.mockResolvedValueOnce({
      id: 'category-1',
      active: false,
    });

    await expect(
      service.create(
        {
          name: 'Papas fritas',
          categoryId: 'category-1',
          unit: ProductUnit.PORTION,
        },
        'manager-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not allow duplicate sku', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'existing-product',
    });

    await expect(
      service.create(
        {
          name: 'Delivery fee',
          sku: 'DEL-001',
          unit: ProductUnit.UNIT,
        },
        'manager-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('lists products by active filter', async () => {
    prismaService.product.findMany.mockResolvedValueOnce([]);

    const result = await service.findAll({ active: true });

    expect(prismaService.product.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        categoryId: undefined,
        OR: undefined,
      },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual([]);
  });

  it('lists products by categoryId filter', async () => {
    prismaService.product.findMany.mockResolvedValueOnce([]);

    await service.findAll({ categoryId: 'category-1' });

    expect(prismaService.product.findMany).toHaveBeenCalledWith({
      where: {
        active: undefined,
        categoryId: 'category-1',
        OR: undefined,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('searches products by text', async () => {
    prismaService.product.findMany.mockResolvedValueOnce([]);

    await service.findAll({ search: 'burger' });

    expect(prismaService.product.findMany).toHaveBeenCalledWith({
      where: {
        active: undefined,
        categoryId: undefined,
        OR: [
          {
            name: {
              contains: 'burger',
              mode: 'insensitive',
            },
          },
          {
            sku: {
              contains: 'burger',
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: { name: 'asc' },
    });
  });

  it('deactivates a product', async () => {
    prismaService.product.update.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Delivery fee',
      description: null,
      sku: 'DEL-001',
      categoryId: null,
      unit: ProductUnit.UNIT,
      stockManagementType: StockManagementType.NON_STOCKED,
      active: false,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.deactivate('product-1');

    expect(prismaService.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { active: false },
    });
    expect(result.active).toBe(false);
  });

  it('reactivates a product', async () => {
    prismaService.product.update.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Delivery fee',
      description: null,
      sku: 'DEL-001',
      categoryId: null,
      unit: ProductUnit.UNIT,
      stockManagementType: StockManagementType.NON_STOCKED,
      active: true,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.reactivate('product-1');

    expect(prismaService.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { active: true },
    });
    expect(result.active).toBe(true);
  });
});
