import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { ProductPriceResponseDto } from './dto/product-price-response.dto';
import { toProductPriceResponse } from './mappers/product-price-response.mapper';

@Injectable()
export class ProductPricesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    productId: string,
    createProductPriceDto: CreateProductPriceDto,
    createdById: string,
  ): Promise<ProductPriceResponseDto> {
    await this.ensureProductActive(productId);
    await this.ensureSalesChannelActive(createProductPriceDto.salesChannelId);

    const priceHistory = await this.prisma.$transaction(
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

      return tx.productPriceHistory.create({
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
      },
    );

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
}
