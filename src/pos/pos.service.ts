import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, StockManagementType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PosCatalogQueryDto } from './dto/pos-catalog-query.dto';
import { PosCatalogResponseDto } from './dto/pos-catalog-response.dto';

type CatalogCursor = { v: 1; name: string; id: string };

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getCatalog(query: PosCatalogQueryDto): Promise<PosCatalogResponseDto> {
    if (!this.config.get<boolean>('POS_CATALOG_V1')) {
      throw new NotFoundException();
    }

    const limit = Math.min(query.limit ?? 50, 50);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const search = query.search?.trim();
    const where: Prisma.ProductWhereInput = {
      active: true,
      stockManagementType: { not: StockManagementType.RECIPE_BASED },
      categoryId: query.categoryId,
      priceHistory: {
        some: { salesChannelId: query.salesChannelId, validTo: null },
      },
      AND: [
        ...(search
          ? [
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { sku: { contains: search, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
        ...(cursor
          ? [
              {
                OR: [
                  { name: { gt: cursor.name } },
                  { name: cursor.name, id: { gt: cursor.id } },
                ],
              },
            ]
          : []),
      ],
    };

    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          sku: true,
          categoryId: true,
          unit: true,
          stockManagementType: true,
          active: true,
          category: { select: { name: true } },
          stock: { select: { currentStock: true, minimumStock: true } },
          priceHistory: {
            where: { salesChannelId: query.salesChannelId, validTo: null },
            select: { price: true },
            take: 1,
          },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: limit + 1,
      }),
      this.prisma.category.findMany({
        where: {
          active: true,
          products: {
            some: {
              active: true,
              stockManagementType: { not: StockManagementType.RECIPE_BASED },
              priceHistory: {
                some: { salesChannelId: query.salesChannelId, validTo: null },
              },
            },
          },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const hasNextPage = products.length > limit;
    const page = products.slice(0, limit);
    const last = page.at(-1);

    return {
      items: page.map((product) => {
        const current = product.stock?.currentStock;
        const minimum = product.stock?.minimumStock;
        const stockStatus =
          product.stockManagementType !== StockManagementType.FINISHED_PRODUCT
            ? 'NOT_TRACKED'
            : !current || current.eq(0)
              ? 'OUT_OF_STOCK'
              : minimum && current.lte(minimum)
                ? 'LOW_STOCK'
                : 'AVAILABLE';

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          sku: product.sku,
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? null,
          unit: product.unit,
          stockManagementType: product.stockManagementType,
          stockStatus,
          currentStock: current?.toString() ?? null,
          currentPrice: product.priceHistory[0]!.price.toString(),
          active: product.active,
        };
      }),
      categories,
      nextCursor:
        hasNextPage && last
          ? this.encodeCursor({ v: 1, name: last.name, id: last.id })
          : null,
    };
  }

  private encodeCursor(cursor: CatalogCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(value: string): CatalogCursor {
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Partial<CatalogCursor>;
      if (parsed.v !== 1 || !parsed.name || !parsed.id) {
        throw new Error('invalid');
      }
      return parsed as CatalogCursor;
    } catch {
      throw new BadRequestException('Invalid POS catalog cursor.');
    }
  }
}
