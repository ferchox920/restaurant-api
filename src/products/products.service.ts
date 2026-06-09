import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { toProductResponse } from './product-response.mapper';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { StockManagementType } from './product.enums';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const product = await this.prisma.product.create({
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

    return toProductResponse(product);
  }

  async findAll(filters?: {
    active?: boolean;
    categoryId?: string;
    search?: string;
  }): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        active: typeof filters?.active === 'boolean' ? filters.active : undefined,
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
  ): Promise<ProductResponseDto> {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product with id "${id}" was not found.`);
    }

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
      const product = await this.prisma.product.update({
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

      return toProductResponse(product);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  async deactivate(id: string): Promise<ProductResponseDto> {
    return this.updateActiveStatus(id, false);
  }

  async reactivate(id: string): Promise<ProductResponseDto> {
    return this.updateActiveStatus(id, true);
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
  ): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: { active },
      });

      return toProductResponse(product);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
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
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(`Product with id "${id}" was not found.`);
    }
  }
}
