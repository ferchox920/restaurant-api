import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { StockManagementType } from '../products/product.enums';
import { InventoryMovementType } from './inventory.enums';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prismaService: {
    $transaction: jest.Mock;
    product: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    productStock: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    inventoryMovement: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      productStock: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      inventoryMovement: {
        findMany: jest.fn(),
      },
    };

    service = new InventoryService(prismaService as unknown as PrismaService);
  });

  it('returns stock 0 and minimumStock 0 for finished products without ProductStock', async () => {
    prismaService.product.findUnique
      .mockResolvedValueOnce({
        id: 'product-1',
        name: 'Hamburguesa clasica',
        sku: 'BURGER-001',
        unit: 'UNIT',
        active: true,
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'product-1',
        name: 'Hamburguesa clasica',
        sku: 'BURGER-001',
        unit: 'UNIT',
        active: true,
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
        stock: null,
      });

    const result = await service.getProductInventory('product-1');

    expect(result.currentStock).toBe('0');
    expect(result.minimumStock).toBe('0');
    expect(result.stockStatus).toBe('OUT_OF_STOCK');
  });

  it('lists inventory and filters by derived LOW_STOCK status', async () => {
    prismaService.product.findMany.mockResolvedValueOnce([
      {
        id: 'product-1',
        name: 'Hamburguesa clasica',
        sku: 'BURGER-001',
        unit: 'UNIT',
        active: true,
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
        stock: {
          currentStock: new Decimal('3'),
          minimumStock: new Decimal('5'),
          updatedAt: new Date('2026-06-09T01:00:00.000Z'),
        },
      },
      {
        id: 'product-2',
        name: 'Papas fritas',
        sku: 'PAP-001',
        unit: 'PORTION',
        active: true,
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
        stock: {
          currentStock: new Decimal('8'),
          minimumStock: new Decimal('2'),
          updatedAt: new Date('2026-06-09T01:00:00.000Z'),
        },
      },
    ]);

    const result = await service.getInventory({
      stockStatus: 'LOW_STOCK',
    });

    expect(prismaService.product.findMany).toHaveBeenCalledWith({
      where: {
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        active: undefined,
        OR: undefined,
      },
      include: {
        stock: {
          select: {
            currentStock: true,
            minimumStock: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.stockStatus).toBe('LOW_STOCK');
  });

  it('creates ProductStock on first STOCK_IN and stores previous/new stock and createdById', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      active: true,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const createStock = jest.fn().mockResolvedValue({
      id: 'stock-1',
      productId: 'product-1',
      currentStock: new Decimal('0'),
      minimumStock: new Decimal('0'),
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });
    const updateStock = jest.fn().mockResolvedValue(undefined);
    const createMovement = jest.fn().mockResolvedValue({
      id: 'movement-1',
      productId: 'product-1',
      movementType: InventoryMovementType.STOCK_IN,
      quantity: new Decimal('3'),
      previousStock: new Decimal('0'),
      newStock: new Decimal('3'),
      reason: 'Produccion inicial del dia',
      referenceType: 'MANUAL',
      referenceId: null,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      product: { name: 'Hamburguesa clasica' },
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productStock: {
          findUnique: jest.fn().mockResolvedValueOnce(null),
          create: createStock,
          update: updateStock,
        },
        inventoryMovement: {
          create: createMovement,
        },
      }),
    );

    const result = await service.stockIn(
      'product-1',
      {
        quantity: 3,
        reason: 'Produccion inicial del dia',
      },
      'manager-1',
    );

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(createStock).toHaveBeenCalled();
    expect(updateStock).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      data: {
        currentStock: expect.any(Decimal),
      },
    });
    expect(createMovement).toHaveBeenCalledWith({
      data: {
        productId: 'product-1',
        movementType: InventoryMovementType.STOCK_IN,
        quantity: expect.any(Decimal),
        previousStock: expect.any(Decimal),
        newStock: expect.any(Decimal),
        reason: 'Produccion inicial del dia',
        referenceType: 'MANUAL',
        createdById: 'manager-1',
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });
    expect(result.previousStock).toBe('0');
    expect(result.newStock).toBe('3');
    expect(result.createdById).toBe('manager-1');
  });

  it('adds stock on STOCK_IN when ProductStock already exists', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      active: true,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productStock: {
          findUnique: jest.fn().mockResolvedValueOnce({
            id: 'stock-1',
            productId: 'product-1',
            currentStock: new Decimal('2'),
            minimumStock: new Decimal('0'),
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            updatedAt: new Date('2026-06-09T00:00:00.000Z'),
          }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue(undefined),
        },
        inventoryMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'movement-1',
            productId: 'product-1',
            movementType: InventoryMovementType.STOCK_IN,
            quantity: new Decimal('3'),
            previousStock: new Decimal('2'),
            newStock: new Decimal('5'),
            reason: 'Reposicion',
            referenceType: 'MANUAL',
            referenceId: null,
            createdById: 'manager-1',
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            product: { name: 'Hamburguesa clasica' },
          }),
        },
      }),
    );

    const result = await service.stockIn(
      'product-1',
      { quantity: 3, reason: 'Reposicion' },
      'manager-1',
    );

    expect(result.newStock).toBe('5');
  });

  it('subtracts stock on WASTE', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      active: true,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productStock: {
          findUnique: jest.fn().mockResolvedValueOnce({
            id: 'stock-1',
            productId: 'product-1',
            currentStock: new Decimal('5'),
            minimumStock: new Decimal('0'),
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            updatedAt: new Date('2026-06-09T00:00:00.000Z'),
          }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue(undefined),
        },
        inventoryMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'movement-1',
            productId: 'product-1',
            movementType: InventoryMovementType.WASTE,
            quantity: new Decimal('2'),
            previousStock: new Decimal('5'),
            newStock: new Decimal('3'),
            reason: 'Producto danado',
            referenceType: 'MANUAL',
            referenceId: null,
            createdById: 'manager-1',
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            product: { name: 'Hamburguesa clasica' },
          }),
        },
      }),
    );

    const result = await service.registerWaste(
      'product-1',
      { quantity: 2, reason: 'Producto danado' },
      'manager-1',
    );

    expect(result.newStock).toBe('3');
  });

  it('rejects WASTE when stock is insufficient', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      active: true,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productStock: {
          findUnique: jest.fn().mockResolvedValueOnce({
            id: 'stock-1',
            productId: 'product-1',
            currentStock: new Decimal('1'),
            minimumStock: new Decimal('0'),
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            updatedAt: new Date('2026-06-09T00:00:00.000Z'),
          }),
          create: jest.fn(),
          update: jest.fn(),
        },
        inventoryMovement: {
          create: jest.fn(),
        },
      }),
    );

    await expect(
      service.registerWaste(
        'product-1',
        { quantity: 2, reason: 'Producto danado' },
        'manager-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('adds stock on RETURN_IN', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      active: true,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productStock: {
          findUnique: jest.fn().mockResolvedValueOnce({
            id: 'stock-1',
            productId: 'product-1',
            currentStock: new Decimal('4'),
            minimumStock: new Decimal('0'),
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            updatedAt: new Date('2026-06-09T00:00:00.000Z'),
          }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue(undefined),
        },
        inventoryMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'movement-1',
            productId: 'product-1',
            movementType: InventoryMovementType.RETURN_IN,
            quantity: new Decimal('1'),
            previousStock: new Decimal('4'),
            newStock: new Decimal('5'),
            reason: 'Reingreso manual',
            referenceType: 'MANUAL',
            referenceId: null,
            createdById: 'manager-1',
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            product: { name: 'Hamburguesa clasica' },
          }),
        },
      }),
    );

    const result = await service.returnIn(
      'product-1',
      { quantity: 1, reason: 'Reingreso manual' },
      'manager-1',
    );

    expect(result.newStock).toBe('5');
  });

  it('adjusts stock to the requested value and stores absolute quantity', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      active: true,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productStock: {
          findUnique: jest.fn().mockResolvedValueOnce({
            id: 'stock-1',
            productId: 'product-1',
            currentStock: new Decimal('8'),
            minimumStock: new Decimal('0'),
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            updatedAt: new Date('2026-06-09T00:00:00.000Z'),
          }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue(undefined),
        },
        inventoryMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'movement-1',
            productId: 'product-1',
            movementType: InventoryMovementType.MANUAL_ADJUSTMENT,
            quantity: new Decimal('3'),
            previousStock: new Decimal('8'),
            newStock: new Decimal('5'),
            reason: 'Conteo fisico de cierre',
            referenceType: 'MANUAL',
            referenceId: null,
            createdById: 'manager-1',
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            product: { name: 'Hamburguesa clasica' },
          }),
        },
      }),
    );

    const result = await service.manualAdjust(
      'product-1',
      { newStock: 5, reason: 'Conteo fisico de cierre' },
      'manager-1',
    );

    expect(result.quantity).toBe('3');
    expect(result.previousStock).toBe('8');
    expect(result.newStock).toBe('5');
  });

  it('rejects MANUAL_ADJUSTMENT with no effective stock change', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      active: true,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        productStock: {
          findUnique: jest.fn().mockResolvedValueOnce({
            id: 'stock-1',
            productId: 'product-1',
            currentStock: new Decimal('5'),
            minimumStock: new Decimal('0'),
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            updatedAt: new Date('2026-06-09T00:00:00.000Z'),
          }),
          create: jest.fn(),
          update: jest.fn(),
        },
        inventoryMovement: {
          create: jest.fn(),
        },
      }),
    );

    await expect(
      service.manualAdjust(
        'product-1',
        { newStock: 5, reason: 'Conteo fisico de cierre' },
        'manager-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('updates minimumStock without creating InventoryMovement', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      active: false,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });
    prismaService.productStock.upsert.mockResolvedValueOnce({
      id: 'stock-1',
      productId: 'product-1',
      currentStock: new Decimal('0'),
      minimumStock: new Decimal('2'),
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T01:00:00.000Z'),
    });

    const result = await service.updateMinimumStock('product-1', {
      minimumStock: 2,
    });

    expect(prismaService.productStock.upsert).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      create: {
        productId: 'product-1',
        currentStock: expect.any(Decimal),
        minimumStock: expect.any(Decimal),
      },
      update: {
        minimumStock: expect.any(Decimal),
      },
    });
    expect(result.minimumStock).toBe('2');
  });

  it('returns movements ordered by createdAt desc with filters', async () => {
    prismaService.inventoryMovement.findMany.mockResolvedValueOnce([]);

    await service.getMovements({
      productId: 'product-1',
      movementType: InventoryMovementType.WASTE,
      from: new Date('2026-06-09T00:00:00.000Z'),
      to: new Date('2026-06-10T00:00:00.000Z'),
    });

    expect(prismaService.inventoryMovement.findMany).toHaveBeenCalledWith({
      where: {
        productId: 'product-1',
        movementType: InventoryMovementType.WASTE,
        createdAt: {
          gte: new Date('2026-06-09T00:00:00.000Z'),
          lte: new Date('2026-06-10T00:00:00.000Z'),
        },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('rejects nonexistent products for inventory reads and writes', async () => {
    prismaService.product.findUnique.mockResolvedValue(null);

    await expect(service.getProductInventory('missing')).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.stockIn('missing', { quantity: 1, reason: 'Carga' }, 'manager-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects inventory movements for inactive products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Hamburguesa clasica',
      sku: 'BURGER-001',
      unit: 'UNIT',
      active: false,
      stockManagementType: StockManagementType.FINISHED_PRODUCT,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    await expect(
      service.stockIn('product-1', { quantity: 1, reason: 'Carga' }, 'manager-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects inventory operations for NON_STOCKED products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Delivery fee',
      sku: 'DEL-001',
      unit: 'UNIT',
      active: true,
      stockManagementType: StockManagementType.NON_STOCKED,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    await expect(
      service.stockIn('product-1', { quantity: 1, reason: 'Carga' }, 'manager-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects inventory operations for RECIPE_BASED products', async () => {
    prismaService.product.findUnique.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Pizza',
      sku: 'PIZ-001',
      unit: 'UNIT',
      active: true,
      stockManagementType: StockManagementType.RECIPE_BASED,
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    await expect(
      service.stockIn('product-1', { quantity: 1, reason: 'Carga' }, 'manager-1'),
    ).rejects.toThrow(ConflictException);
  });
});
