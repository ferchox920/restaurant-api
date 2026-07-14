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
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { ProductPriceResponseDto } from './dto/product-price-response.dto';
import { toProductPriceResponse } from './mappers/product-price-response.mapper';

@Injectable()
export class ProductPricesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
  ) {}

  async create(
    productId: string,
    createProductPriceDto: CreateProductPriceDto,
    createdById: string,
  ): Promise<ProductPriceResponseDto> {
    await this.ensureProductActive(productId);
    await this.ensureSalesChannelActive(createProductPriceDto.salesChannelId);

    let priceHistory;
    try {
      priceHistory = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const now = new Date();
          const currentPrice = await tx.productPriceHistory.findFirst({
            where: {
              productId,
              salesChannelId: createProductPriceDto.salesChannelId,
              validTo: null,
            },
            orderBy: {
              validFrom: 'desc',
            },
          });

          if (currentPrice) {
            await tx.productPriceHistory.update({
              where: { id: currentPrice.id },
              data: { validTo: now },
            });
          }

          const createdPriceHistory = await tx.productPriceHistory.create({
            data: {
              productId,
              salesChannelId: createProductPriceDto.salesChannelId,
              price: createProductPriceDto.price,
              validFrom: now,
              validTo: null,
              createdById,
            },
            include: {
              salesChannel: {
                select: {
                  name: true,
                },
              },
            },
          });

          await this.auditService.log(
            {
              userId: createdById,
              action: AuditAction.PRODUCT_PRICE_CREATED,
              entityType: AuditEntityType.PRODUCT_PRICE_HISTORY,
              entityId: createdPriceHistory.id,
              beforeData: currentPrice
                ? {
                    id: currentPrice.id,
                    productId: currentPrice.productId,
                    salesChannelId: currentPrice.salesChannelId,
                    price: currentPrice.price?.toString?.() ?? null,
                    validFrom: currentPrice.validFrom ?? null,
                    validTo: currentPrice.validTo ?? null,
                    createdById: currentPrice.createdById ?? null,
                    createdAt: currentPrice.createdAt ?? null,
                  }
                : null,
              afterData: toProductPriceResponse(createdPriceHistory),
              metadata: {
                productId,
                salesChannelId: createProductPriceDto.salesChannelId,
              },
            },
            tx,
          );

          return createdPriceHistory;
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A current price already exists for this product and sales channel.',
        );
      }
      throw error;
    }

    return toProductPriceResponse(priceHistory);
  }

  async findCurrent(
    productId: string,
    salesChannelId: string,
  ): Promise<ProductPriceResponseDto> {
    await this.ensureProductExists(productId);
    await this.ensureSalesChannelExists(salesChannelId);

    const currentPrice = await this.prisma.productPriceHistory.findFirst({
      where: {
        productId,
        salesChannelId,
        validTo: null,
      },
      include: {
        salesChannel: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        validFrom: 'desc',
      },
    });

    if (!currentPrice) {
      throw new NotFoundException(
        `Current price for product "${productId}" and sales channel "${salesChannelId}" was not found.`,
      );
    }

    return toProductPriceResponse(currentPrice);
  }

  async findHistory(
    productId: string,
    salesChannelId?: string,
    pagination: PaginationQueryDto = {},
  ): Promise<ProductPriceResponseDto[]> {
    await this.ensureProductExists(productId);

    if (salesChannelId) {
      await this.ensureSalesChannelExists(salesChannelId);
    }

    const history = await this.prisma.productPriceHistory.findMany({
      where: {
        productId,
        salesChannelId,
      },
      include: {
        salesChannel: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        validFrom: 'desc',
      },
      ...(pagination.limit !== undefined ? { take: pagination.limit } : {}),
      ...(pagination.offset !== undefined ? { skip: pagination.offset } : {}),
    });

    return history.map(toProductPriceResponse);
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
        'The provided product is inactive and cannot receive new prices.',
      );
    }
  }

  private async ensureSalesChannelExists(
    salesChannelId: string,
  ): Promise<void> {
    const salesChannel = await this.prisma.salesChannel.findUnique({
      where: { id: salesChannelId },
      select: {
        id: true,
      },
    });

    if (!salesChannel) {
      throw new NotFoundException(
        `Sales channel with id "${salesChannelId}" was not found.`,
      );
    }
  }

  private async ensureSalesChannelActive(
    salesChannelId: string,
  ): Promise<void> {
    const salesChannel = await this.prisma.salesChannel.findUnique({
      where: { id: salesChannelId },
      select: {
        id: true,
        active: true,
      },
    });

    if (!salesChannel) {
      throw new NotFoundException(
        `Sales channel with id "${salesChannelId}" was not found.`,
      );
    }

    if (!salesChannel.active) {
      throw new BadRequestException(
        'The provided sales channel is inactive and cannot receive new prices.',
      );
    }
  }

  private runInTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return runSerializableTransaction(this.prisma, callback);
  }
}
