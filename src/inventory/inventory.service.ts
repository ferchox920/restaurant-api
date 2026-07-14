import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { runSerializableTransaction } from '../database/transaction';
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
type InternalMovementParams = {
  productId: string;
  quantity: Decimal | number | string;
  reason: string;
  referenceId?: string;
  createdById: string;
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
  ) {}

  async getInventory(
    filters: InventoryQueryDto,
  ): Promise<InventoryStockResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        active:
          typeof filters.active === 'boolean' ? filters.active : undefined,
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
      ...(!filters.stockStatus && filters.limit !== undefined
        ? { take: filters.limit }
        : {}),
      ...(!filters.stockStatus && filters.offset !== undefined
        ? { skip: filters.offset }
        : {}),
    });

    const inventory = products.map(toInventoryStockResponse);

    if (!filters.stockStatus) {
      return inventory;
    }

    const filteredInventory = inventory.filter(
      (item: InventoryStockResponseDto) =>
        item.stockStatus === filters.stockStatus,
    );

    const offset = filters.offset ?? 0;
    return filteredInventory.slice(offset, offset + (filters.limit ?? 50));
  }

  async getProductInventory(
    productId: string,
  ): Promise<InventoryStockResponseDto> {
    const productWithStock = await this.prisma.product.findUnique({
      where: { id: productId },
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

    this.ensureFinishedProduct(productWithStock);

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
      ...(filters.limit !== undefined ? { take: filters.limit } : {}),
      ...(filters.offset !== undefined ? { skip: filters.offset } : {}),
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

    const movement = await this.runInTransaction(
      async (tx: InventoryTransactionClient) => {
        const movement = await this.applyMovement(tx, {
          productId,
          quantity: dto.quantity,
          reason: dto.reason,
          createdById,
          movementType: InventoryMovementType.STOCK_IN,
          referenceType: InventoryReferenceType.MANUAL,
          operation: 'add',
        });

        await this.auditInventoryMovement(
          tx,
          createdById,
          AuditAction.INVENTORY_STOCK_IN,
          movement,
        );

        return movement;
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

    const movement = await this.runInTransaction(
      async (tx: InventoryTransactionClient) => {
        const stock = await this.getOrCreateProductStockForUpdate(
          tx,
          productId,
        );
        const previousStock = stock.currentStock;
        const newStock = new Decimal(dto.newStock);

        if (newStock.eq(previousStock)) {
          throw new ConflictException(
            'Manual adjustment target matches the current stock and would not create a meaningful movement.',
          );
        }

        const movement = await this.persistMovement(tx, {
          productId,
          quantity: previousStock.sub(newStock).abs(),
          previousStock,
          newStock,
          reason: dto.reason,
          createdById,
          movementType: InventoryMovementType.MANUAL_ADJUSTMENT,
          referenceType: InventoryReferenceType.MANUAL,
        });

        await this.auditInventoryMovement(
          tx,
          createdById,
          AuditAction.INVENTORY_MANUAL_ADJUSTMENT,
          movement,
        );

        return movement;
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

    const movement = await this.runInTransaction(
      async (tx: InventoryTransactionClient) => {
        const movement = await this.applyMovement(tx, {
          productId,
          quantity: dto.quantity,
          reason: dto.reason,
          createdById,
          movementType: InventoryMovementType.WASTE,
          referenceType: InventoryReferenceType.MANUAL,
          operation: 'subtract',
          insufficientStockMessage:
            'Insufficient stock to register waste for the requested quantity.',
        });

        await this.auditInventoryMovement(
          tx,
          createdById,
          AuditAction.INVENTORY_WASTE,
          movement,
        );

        return movement;
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

    const movement = await this.runInTransaction(
      async (tx: InventoryTransactionClient) => {
        const movement = await this.applyMovement(tx, {
          productId,
          quantity: dto.quantity,
          reason: dto.reason,
          createdById,
          movementType: InventoryMovementType.RETURN_IN,
          referenceType: InventoryReferenceType.MANUAL,
          operation: 'add',
        });

        await this.auditInventoryMovement(
          tx,
          createdById,
          AuditAction.INVENTORY_RETURN_IN,
          movement,
        );

        return movement;
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
    actorUserId?: string,
  ): Promise<InventoryStockResponseDto> {
    const product = await this.findProductForRead(productId);

    const result = await this.runInTransaction(
      async (tx: InventoryTransactionClient) => {
        const existingStock = await tx.productStock.findUnique({
          where: { productId },
        });

        const stock = await tx.productStock.upsert({
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

        const response = toInventoryStockResponse({
          ...product,
          stock: {
            currentStock: stock.currentStock,
            minimumStock: stock.minimumStock,
            updatedAt: stock.updatedAt,
          },
        });

        await this.auditService.log(
          {
            userId: actorUserId,
            action: AuditAction.INVENTORY_MINIMUM_STOCK_UPDATED,
            entityType: AuditEntityType.PRODUCT_STOCK,
            entityId: stock.id,
            beforeData: existingStock
              ? {
                  productId: existingStock.productId,
                  currentStock: existingStock.currentStock.toString(),
                  minimumStock: existingStock.minimumStock.toString(),
                  updatedAt: existingStock.updatedAt,
                }
              : null,
            afterData: response,
            metadata: {
              productId,
            },
          },
          tx,
        );

        return response;
      },
    );

    return result;
  }

  async applySaleOut(
    params: InternalMovementParams,
    tx: InventoryTransactionClient,
  ): Promise<Awaited<ReturnType<InventoryService['persistMovement']>>> {
    const movement = await this.applyMovement(tx, {
      ...params,
      movementType: InventoryMovementType.SALE_OUT,
      referenceType: InventoryReferenceType.SALE_TICKET,
      operation: 'subtract',
      insufficientStockMessage:
        'Insufficient stock to confirm the sale ticket for the requested product.',
    });

    await this.auditInventoryMovement(
      tx,
      params.createdById,
      AuditAction.INVENTORY_SALE_OUT,
      movement,
    );

    return movement;
  }

  async applyVoidReversal(
    params: InternalMovementParams,
    tx: InventoryTransactionClient,
  ): Promise<Awaited<ReturnType<InventoryService['persistMovement']>>> {
    const movement = await this.applyMovement(tx, {
      ...params,
      movementType: InventoryMovementType.VOID_REVERSAL,
      referenceType: InventoryReferenceType.SALE_VOID,
      operation: 'add',
    });

    await this.auditInventoryMovement(
      tx,
      params.createdById,
      AuditAction.INVENTORY_VOID_REVERSAL,
      movement,
    );

    return movement;
  }

  async getOrCreateProductStockForUpdate(
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

  private async findProductForRead(
    productId: string,
  ): Promise<ProductForInventory> {
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

  private async applyMovement(
    tx: InventoryTransactionClient,
    params: InternalMovementParams & {
      movementType: InventoryMovementType;
      referenceType: InventoryReferenceType;
      operation: 'add' | 'subtract';
      insufficientStockMessage?: string;
    },
  ) {
    const stock = await this.getOrCreateProductStockForUpdate(
      tx,
      params.productId,
    );
    const previousStock = stock.currentStock;
    const quantity = new Decimal(params.quantity);
    const newStock =
      params.operation === 'add'
        ? previousStock.add(quantity)
        : previousStock.sub(quantity);

    if (newStock.lt(0)) {
      throw new ConflictException(
        params.insufficientStockMessage ??
          'The requested inventory movement would leave the product with negative stock.',
      );
    }

    return this.persistMovement(tx, {
      productId: params.productId,
      quantity,
      previousStock,
      newStock,
      reason: params.reason,
      referenceId: params.referenceId,
      createdById: params.createdById,
      movementType: params.movementType,
      referenceType: params.referenceType,
    });
  }

  private async persistMovement(
    tx: InventoryTransactionClient,
    params: {
      productId: string;
      quantity: Decimal;
      previousStock: Decimal;
      newStock: Decimal;
      reason: string;
      referenceId?: string;
      createdById: string;
      movementType: InventoryMovementType;
      referenceType: InventoryReferenceType;
    },
  ) {
    await tx.productStock.update({
      where: { productId: params.productId },
      data: {
        currentStock: params.newStock,
      },
    });

    return tx.inventoryMovement.create({
      data: {
        productId: params.productId,
        movementType: params.movementType,
        quantity: params.quantity,
        previousStock: params.previousStock,
        newStock: params.newStock,
        reason: params.reason,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        createdById: params.createdById,
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  private async auditInventoryMovement(
    tx: InventoryTransactionClient,
    actorUserId: string,
    action: AuditAction,
    movement: Awaited<ReturnType<InventoryService['persistMovement']>>,
  ): Promise<void> {
    await this.auditService.log(
      {
        userId: actorUserId,
        action,
        entityType: AuditEntityType.INVENTORY_MOVEMENT,
        entityId: movement.id,
        beforeData: {
          productId: movement.productId,
          previousStock: movement.previousStock.toString(),
        },
        afterData: {
          id: movement.id,
          productId: movement.productId,
          movementType: movement.movementType,
          quantity: movement.quantity.toString(),
          previousStock: movement.previousStock.toString(),
          newStock: movement.newStock.toString(),
          reason: movement.reason,
          referenceType: movement.referenceType,
          referenceId: movement.referenceId,
          createdById: movement.createdById,
          createdAt: movement.createdAt,
        },
        metadata: {
          productName: movement.product.name,
        },
      },
      tx,
    );
  }

  private runInTransaction<T>(
    callback: (tx: InventoryTransactionClient) => Promise<T>,
  ): Promise<T> {
    return runSerializableTransaction(this.prisma, callback);
  }
}
