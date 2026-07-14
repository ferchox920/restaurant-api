import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { runSerializableTransaction } from '../database/transaction';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
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

    let costHistory;
    try {
      costHistory = await this.runInTransaction(
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A current cost already exists for this product.',
        );
      }
      throw error;
    }

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

  async findHistory(
    productId: string,
    pagination: PaginationQueryDto = {},
  ): Promise<ProductCostResponseDto[]> {
    await this.ensureProductExists(productId);

    const history = await this.prisma.productCostHistory.findMany({
      where: { productId },
      orderBy: {
        validFrom: 'desc',
      },
      ...(pagination.limit !== undefined ? { take: pagination.limit } : {}),
      ...(pagination.offset !== undefined ? { skip: pagination.offset } : {}),
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
    return runSerializableTransaction(this.prisma, callback);
  }
}
