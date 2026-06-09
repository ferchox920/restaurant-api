import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { StockManagementType } from '../products/product.enums';
import { InventoryMovementsQueryDto } from './dto/inventory-movements-query.dto';
import { InventoryMovementResponseDto } from './dto/inventory-movement-response.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { InventoryStockResponseDto } from './dto/inventory-stock-response.dto';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto';
import { ReturnInDto } from './dto/return-in.dto';
import { StockInDto } from './dto/stock-in.dto';
import { UpdateMinimumStockDto } from './dto/update-minimum-stock.dto';
import { WasteDto } from './dto/waste.dto';
import {
  InventoryMovementType,
  InventoryReferenceType,
  InventoryStockStatus,
} from './inventory.enums';
import { toInventoryMovementResponse } from './mappers/inventory-movement-response.mapper';
import { toInventoryStockResponse } from './mappers/inventory-stock-response.mapper';

type ProductForInventory = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  active: boolean;
  stockManagementType: StockManagementType;
  updatedAt: Date;
};

type ProductStockRecord = {
  id: string;
  productId: string;
  currentStock: Decimal;
  minimumStock: Decimal;
  createdAt: Date;
  updatedAt: Date;
};

type InventoryTransactionClient = Prisma.TransactionClient;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventory(
    filters: InventoryQueryDto,
  ): Promise<InventoryStockResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        active: typeof filters.active === 'boolean' ? filters.active : undefined,
        OR: filters.search
          ? [
              {
                name: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                sku: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
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

    const inventory = products.map(toInventoryStockResponse);

    if (!filters.stockStatus) {
      return inventory;
    }

    return inventory.filter(
      (item: InventoryStockResponseDto) =>
        item.stockStatus === filters.stockStatus,
    );
  }

  async getProductInventory(productId: string): Promise<InventoryStockResponseDto> {
    const product = await this.findProductForRead(productId);

    const productWithStock = await this.prisma.product.findUnique({
      where: { id: product.id },
      include: {
        stock: {
          select: {
            currentStock: true,
            minimumStock: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!productWithStock) {
      throw new NotFoundException(
        `Product with id "${productId}" was not found.`,
      );
    }

    return toInventoryStockResponse(productWithStock);
  }

  async getMovements(
    filters: InventoryMovementsQueryDto,
  ): Promise<InventoryMovementResponseDto[]> {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        productId: filters.productId,
        movementType: filters.movementType,
        createdAt:
          filters.from || filters.to
            ? {
                gte: filters.from,
                lte: filters.to,
              }
            : undefined,
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

    return movements.map(toInventoryMovementResponse);
  }

  async getProductMovements(
    productId: string,
    filters?: Omit<InventoryMovementsQueryDto, 'productId'>,
  ): Promise<InventoryMovementResponseDto[]> {
    await this.findProductForRead(productId);

    return this.getMovements({
      ...filters,
      productId,
    });
  }

  async stockIn(
    productId: string,
    dto: StockInDto,
    createdById: string,
  ): Promise<InventoryMovementResponseDto> {
    const product = await this.findProductForMovement(productId);

    const movement = await this.prisma.$transaction(
      async (tx: InventoryTransactionClient) => {
      const stock = await this.ensureProductStock(tx, productId);
      const previousStock = stock.currentStock;
      const quantity = new Decimal(dto.quantity);
      const newStock = previousStock.add(quantity);

      await tx.productStock.update({
        where: { productId },
        data: {
          currentStock: newStock,
        },
      });

      return tx.inventoryMovement.create({
        data: {
          productId,
          movementType: InventoryMovementType.STOCK_IN,
          quantity,
          previousStock,
          newStock,
          reason: dto.reason,
          referenceType: InventoryReferenceType.MANUAL,
          createdById,
        },
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      });
      },
    );

    return toInventoryMovementResponse({
      ...movement,
      product: movement.product ?? { name: product.name },
    });
  }

  async manualAdjust(
    productId: string,
    dto: ManualAdjustmentDto,
    createdById: string,
  ): Promise<InventoryMovementResponseDto> {
    const product = await this.findProductForMovement(productId);

    const movement = await this.prisma.$transaction(
      async (tx: InventoryTransactionClient) => {
      const stock = await this.ensureProductStock(tx, productId);
      const previousStock = stock.currentStock;
      const newStock = new Decimal(dto.newStock);

      if (newStock.eq(previousStock)) {
        throw new ConflictException(
          'Manual adjustment target matches the current stock and would not create a meaningful movement.',
        );
      }

      const quantity = previousStock.sub(newStock).abs();

      await tx.productStock.update({
        where: { productId },
        data: {
          currentStock: newStock,
        },
      });

      return tx.inventoryMovement.create({
        data: {
          productId,
          movementType: InventoryMovementType.MANUAL_ADJUSTMENT,
          quantity,
          previousStock,
          newStock,
          reason: dto.reason,
          referenceType: InventoryReferenceType.MANUAL,
          createdById,
        },
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      });
      },
    );

    return toInventoryMovementResponse({
      ...movement,
      product: movement.product ?? { name: product.name },
    });
  }

  async registerWaste(
    productId: string,
    dto: WasteDto,
    createdById: string,
  ): Promise<InventoryMovementResponseDto> {
    const product = await this.findProductForMovement(productId);

    const movement = await this.prisma.$transaction(
      async (tx: InventoryTransactionClient) => {
      const stock = await this.ensureProductStock(tx, productId);
      const previousStock = stock.currentStock;
      const quantity = new Decimal(dto.quantity);
      const newStock = previousStock.sub(quantity);

      if (newStock.lt(0)) {
        throw new ConflictException(
          'Insufficient stock to register waste for the requested quantity.',
        );
      }

      await tx.productStock.update({
        where: { productId },
        data: {
          currentStock: newStock,
        },
      });

      return tx.inventoryMovement.create({
        data: {
          productId,
          movementType: InventoryMovementType.WASTE,
          quantity,
          previousStock,
          newStock,
          reason: dto.reason,
          referenceType: InventoryReferenceType.MANUAL,
          createdById,
        },
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      });
      },
    );

    return toInventoryMovementResponse({
      ...movement,
      product: movement.product ?? { name: product.name },
    });
  }

  async returnIn(
    productId: string,
    dto: ReturnInDto,
    createdById: string,
  ): Promise<InventoryMovementResponseDto> {
    const product = await this.findProductForMovement(productId);

    const movement = await this.prisma.$transaction(
      async (tx: InventoryTransactionClient) => {
      const stock = await this.ensureProductStock(tx, productId);
      const previousStock = stock.currentStock;
      const quantity = new Decimal(dto.quantity);
      const newStock = previousStock.add(quantity);

      await tx.productStock.update({
        where: { productId },
        data: {
          currentStock: newStock,
        },
      });

      return tx.inventoryMovement.create({
        data: {
          productId,
          movementType: InventoryMovementType.RETURN_IN,
          quantity,
          previousStock,
          newStock,
          reason: dto.reason,
          referenceType: InventoryReferenceType.MANUAL,
          createdById,
        },
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      });
      },
    );

    return toInventoryMovementResponse({
      ...movement,
      product: movement.product ?? { name: product.name },
    });
  }

  async updateMinimumStock(
    productId: string,
    dto: UpdateMinimumStockDto,
  ): Promise<InventoryStockResponseDto> {
    const product = await this.findProductForRead(productId);

    const stock = await this.prisma.productStock.upsert({
      where: { productId },
      create: {
        productId,
        currentStock: new Decimal(0),
        minimumStock: new Decimal(dto.minimumStock),
      },
      update: {
        minimumStock: new Decimal(dto.minimumStock),
      },
    });

    return toInventoryStockResponse({
      ...product,
      stock: {
        currentStock: stock.currentStock,
        minimumStock: stock.minimumStock,
        updatedAt: stock.updatedAt,
      },
    });
  }

  private async findProductForRead(productId: string): Promise<ProductForInventory> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        active: true,
        stockManagementType: true,
        updatedAt: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with id "${productId}" was not found.`,
      );
    }

    this.ensureFinishedProduct(product);

    return product;
  }

  private async findProductForMovement(
    productId: string,
  ): Promise<ProductForInventory> {
    const product = await this.findProductForRead(productId);

    if (!product.active) {
      throw new ConflictException(
        'The provided product is inactive and cannot receive inventory movements.',
      );
    }

    return product;
  }

  private ensureFinishedProduct(product: ProductForInventory): void {
    if (product.stockManagementType === StockManagementType.NON_STOCKED) {
      throw new ConflictException(
        'The provided product does not accept inventory management because it is NON_STOCKED.',
      );
    }

    if (product.stockManagementType === StockManagementType.RECIPE_BASED) {
      throw new ConflictException(
        'Recipe-based inventory is not implemented yet for RECIPE_BASED products.',
      );
    }
  }

  private async ensureProductStock(
    tx: InventoryTransactionClient,
    productId: string,
  ): Promise<ProductStockRecord> {
    const existingStock = await tx.productStock.findUnique({
      where: { productId },
    });

    if (existingStock) {
      return existingStock;
    }

    return tx.productStock.create({
      data: {
        productId,
        currentStock: new Decimal(0),
        minimumStock: new Decimal(0),
      },
    });
  }
}
