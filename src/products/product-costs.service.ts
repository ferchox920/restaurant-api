import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { CreateProductCostDto } from './dto/create-product-cost.dto';
import { ProductCostResponseDto } from './dto/product-cost-response.dto';
import { toProductCostResponse } from './mappers/product-cost-response.mapper';

@Injectable()
export class ProductCostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
  ) {}

  async create(
    productId: string,
    createProductCostDto: CreateProductCostDto,
    createdById: string,
  ): Promise<ProductCostResponseDto> {
    await this.ensureProductActive(productId);

    const costHistory = await this.runInTransaction(
      async (tx: Prisma.TransactionClient) => {
        const now = new Date();
        const currentCost = await tx.productCostHistory.findFirst({
          where: {
            productId,
            validTo: null,
          },
          orderBy: {
            validFrom: 'desc',
          },
        });

        if (currentCost) {
          await tx.productCostHistory.update({
            where: { id: currentCost.id },
            data: { validTo: now },
          });
        }

        const createdCostHistory = await tx.productCostHistory.create({
          data: {
            productId,
            cost: createProductCostDto.cost,
            validFrom: now,
            validTo: null,
            createdById,
          },
        });

        await this.auditService.log(
          {
            userId: createdById,
            action: AuditAction.PRODUCT_COST_CREATED,
            entityType: AuditEntityType.PRODUCT_COST_HISTORY,
            entityId: createdCostHistory.id,
            beforeData: currentCost
              ? {
                  id: currentCost.id,
                  productId: currentCost.productId,
                  cost: currentCost.cost?.toString?.() ?? null,
                  validFrom: currentCost.validFrom ?? null,
                  validTo: currentCost.validTo ?? null,
                  createdById: currentCost.createdById ?? null,
                  createdAt: currentCost.createdAt ?? null,
                }
              : null,
            afterData: toProductCostResponse(createdCostHistory),
            metadata: {
              productId,
            },
          },
          tx,
        );

        return createdCostHistory;
      },
    );

    return toProductCostResponse(costHistory);
  }

  async findCurrent(productId: string): Promise<ProductCostResponseDto> {
    await this.ensureProductExists(productId);

    const currentCost = await this.prisma.productCostHistory.findFirst({
      where: {
        productId,
        validTo: null,
      },
      orderBy: {
        validFrom: 'desc',
      },
    });

    if (!currentCost) {
      throw new NotFoundException(
        `Current cost for product with id "${productId}" was not found.`,
      );
    }

    return toProductCostResponse(currentCost);
  }

  async findHistory(productId: string): Promise<ProductCostResponseDto[]> {
    await this.ensureProductExists(productId);

    const history = await this.prisma.productCostHistory.findMany({
      where: { productId },
      orderBy: {
        validFrom: 'desc',
      },
    });

    return history.map(toProductCostResponse);
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with id "${productId}" was not found.`,
      );
    }
  }

  private async ensureProductActive(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        active: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with id "${productId}" was not found.`,
      );
    }

    if (!product.active) {
      throw new BadRequestException(
        'The provided product is inactive and cannot receive new costs.',
      );
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

    return transactionResult.then((result) =>
        result === undefined
          ? callback(this.prisma as unknown as Prisma.TransactionClient)
          : result,
      );
  }
}
