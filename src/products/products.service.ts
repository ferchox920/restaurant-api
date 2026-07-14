import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { toProductResponse } from './product-response.mapper';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { StockManagementType } from './product.enums';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    createdById: string,
  ): Promise<ProductResponseDto> {
    if (createProductDto.sku) {
      await this.ensureSkuUnique(createProductDto.sku);
    }

    if (createProductDto.categoryId) {
      await this.ensureCategoryUsable(createProductDto.categoryId);
    }

    this.validateStockManagementType(createProductDto.stockManagementType);

    const product = await this.runInTransaction(
      async (tx: Prisma.TransactionClient) => {
        const createdProduct = await tx.product.create({
          data: {
            name: createProductDto.name,
            description: createProductDto.description ?? null,
            sku: createProductDto.sku ?? null,
            categoryId: createProductDto.categoryId ?? null,
            unit: createProductDto.unit,
            stockManagementType:
              createProductDto.stockManagementType ??
              StockManagementType.FINISHED_PRODUCT,
            createdById,
          },
        });

        await this.auditService.log(
          {
            userId: createdById,
            action: AuditAction.PRODUCT_CREATED,
            entityType: AuditEntityType.PRODUCT,
            entityId: createdProduct.id,
            beforeData: null,
            afterData: toProductResponse(createdProduct),
          },
          tx,
        );

        return createdProduct;
      },
    );

    return toProductResponse(product);
  }

  async findAll(filters?: {
    active?: boolean;
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        active:
          typeof filters?.active === 'boolean' ? filters.active : undefined,
        categoryId: filters?.categoryId,
        OR: filters?.search
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
      orderBy: { name: 'asc' },
      ...(filters?.limit !== undefined ? { take: filters.limit } : {}),
      ...(filters?.offset !== undefined ? { skip: filters.offset } : {}),
    });

    return products.map(toProductResponse);
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" was not found.`);
    }

    return toProductResponse(product);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    actorUserId?: string,
  ): Promise<ProductResponseDto> {
    const existingProduct = await this.getProductOrThrow(id);

    if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
      await this.ensureSkuUnique(updateProductDto.sku);
    }

    if (updateProductDto.categoryId) {
      await this.ensureCategoryUsable(updateProductDto.categoryId);
    }

    if (updateProductDto.stockManagementType) {
      this.validateStockManagementType(updateProductDto.stockManagementType);
    }

    try {
      const product = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedProduct = await tx.product.update({
            where: { id },
            data: {
              ...updateProductDto,
              description:
                updateProductDto.description === undefined
                  ? undefined
                  : updateProductDto.description,
              sku:
                updateProductDto.sku === undefined
                  ? undefined
                  : updateProductDto.sku,
              categoryId:
                updateProductDto.categoryId === undefined
                  ? undefined
                  : updateProductDto.categoryId,
            },
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action: AuditAction.PRODUCT_UPDATED,
              entityType: AuditEntityType.PRODUCT,
              entityId: updatedProduct.id,
              beforeData: existingProduct
                ? toProductResponse(existingProduct)
                : null,
              afterData: toProductResponse(updatedProduct),
            },
            tx,
          );

          return updatedProduct;
        },
      );

      return toProductResponse(product);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  async deactivate(
    id: string,
    actorUserId?: string,
  ): Promise<ProductResponseDto> {
    return this.updateActiveStatus(
      id,
      false,
      actorUserId,
      AuditAction.PRODUCT_DEACTIVATED,
    );
  }

  async reactivate(
    id: string,
    actorUserId?: string,
  ): Promise<ProductResponseDto> {
    return this.updateActiveStatus(
      id,
      true,
      actorUserId,
      AuditAction.PRODUCT_REACTIVATED,
    );
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
    actorUserId: string | undefined,
    action: AuditAction,
  ): Promise<ProductResponseDto> {
    const existingProduct = await this.findProduct(id);

    try {
      const product = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedProduct = await tx.product.update({
            where: { id },
            data: { active },
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action,
              entityType: AuditEntityType.PRODUCT,
              entityId: updatedProduct.id,
              beforeData: existingProduct
                ? toProductResponse(existingProduct)
                : null,
              afterData: toProductResponse(updatedProduct),
            },
            tx,
          );

          return updatedProduct;
        },
      );

      return toProductResponse(product);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  private async getProductOrThrow(id: string) {
    const product = await this.findProduct(id);

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" was not found.`);
    }

    return product;
  }

  private findProduct(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
    });
  }

  private async ensureSkuUnique(sku: string): Promise<void> {
    const existingProduct = await this.prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });

    if (existingProduct) {
      throw new ConflictException('A product with this SKU already exists.');
    }
  }

  private async ensureCategoryUsable(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        active: true,
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with id "${categoryId}" was not found.`,
      );
    }

    if (!category.active) {
      throw new BadRequestException(
        'The provided category is inactive and cannot be used for products.',
      );
    }
  }

  private validateStockManagementType(
    stockManagementType?: StockManagementType,
  ): void {
    if (stockManagementType === undefined) {
      return;
    }

    if (
      stockManagementType !== StockManagementType.FINISHED_PRODUCT &&
      stockManagementType !== StockManagementType.NON_STOCKED &&
      stockManagementType !== StockManagementType.RECIPE_BASED
    ) {
      throw new BadRequestException('Invalid stockManagementType value.');
    }
  }

  private handlePrismaNotFound(error: unknown, id: string): never | void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(`Product with id "${id}" was not found.`);
    }
  }

  private runInTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!this.prisma.$transaction) {
      return callback(this.prisma as unknown as Prisma.TransactionClient);
    }

    const transactionResult = this.prisma.$transaction(callback);

    if (
      !transactionResult ||
      typeof (transactionResult as Promise<T>).then !== 'function'
    ) {
      return callback(this.prisma as unknown as Prisma.TransactionClient);
    }

    return transactionResult;
  }
}
