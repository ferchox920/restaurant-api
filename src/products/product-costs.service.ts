import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateProductCostDto } from './dto/create-product-cost.dto';
import { ProductCostResponseDto } from './dto/product-cost-response.dto';
import { toProductCostResponse } from './mappers/product-cost-response.mapper';

@Injectable()
export class ProductCostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    productId: string,
    createProductCostDto: CreateProductCostDto,
    createdById: string,
  ): Promise<ProductCostResponseDto> {
    await this.ensureProductActive(productId);

    const costHistory = await this.prisma.$transaction(
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

      return tx.productCostHistory.create({
        data: {
          productId,
          cost: createProductCostDto.cost,
          validFrom: now,
          validTo: null,
          createdById,
        },
      });
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
}
