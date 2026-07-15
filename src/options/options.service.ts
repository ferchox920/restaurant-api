import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { OptionsQueryDto } from './dto/options-query.dto';

export enum OptionResource {
  categories = 'categories',
  users = 'users',
  salesChannels = 'sales-channels',
  paymentBanks = 'payment-banks',
  tables = 'tables',
  products = 'products',
}

type OptionItem = { id: string; label: string; active: boolean };

@Injectable()
export class OptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async find(resource: OptionResource, query: OptionsQueryDto) {
    if (!this.config.get<boolean>('POS_CATALOG_V1')) {
      throw new NotFoundException();
    }
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = query.cursor ? this.decodeCursor(query.cursor) : 0;
    const search = query.search?.trim();
    const active = query.active;
    let items: OptionItem[];

    switch (resource) {
      case OptionResource.categories:
        items = (
          await this.prisma.category.findMany({
            where: {
              active,
              name: search
                ? { contains: search, mode: 'insensitive' }
                : undefined,
            },
            select: { id: true, name: true, active: true },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            take: limit + 1,
            skip,
          })
        ).map(({ id, name: label, active }) => ({ id, label, active }));
        break;
      case OptionResource.users:
        items = (
          await this.prisma.user.findMany({
            where: {
              active,
              OR: search
                ? [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                  ]
                : undefined,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              active: true,
            },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
            take: limit + 1,
            skip,
          })
        ).map((item) => ({
          id: item.id,
          label: `${item.firstName} ${item.lastName}`.trim() || item.email,
          active: item.active,
        }));
        break;
      case OptionResource.salesChannels:
        items = (
          await this.prisma.salesChannel.findMany({
            where: {
              active,
              OR: search
                ? [
                    { name: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } },
                  ]
                : undefined,
            },
            select: { id: true, name: true, active: true },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            take: limit + 1,
            skip,
          })
        ).map(({ id, name: label, active }) => ({ id, label, active }));
        break;
      case OptionResource.paymentBanks:
        items = (
          await this.prisma.paymentBank.findMany({
            where: {
              active,
              name: search
                ? { contains: search, mode: 'insensitive' }
                : undefined,
            },
            select: { id: true, name: true, active: true },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            take: limit + 1,
            skip,
          })
        ).map(({ id, name: label, active }) => ({ id, label, active }));
        break;
      case OptionResource.tables:
        items = (
          await this.prisma.restaurantTable.findMany({
            where: {
              active,
              OR: search
                ? [
                    { code: { contains: search, mode: 'insensitive' } },
                    { name: { contains: search, mode: 'insensitive' } },
                  ]
                : undefined,
            },
            select: { id: true, code: true, name: true, active: true },
            orderBy: [{ code: 'asc' }, { id: 'asc' }],
            take: limit + 1,
            skip,
          })
        ).map((item) => ({
          id: item.id,
          label: item.name ? `${item.code} - ${item.name}` : item.code,
          active: item.active,
        }));
        break;
      case OptionResource.products:
        items = (
          await this.prisma.product.findMany({
            where: {
              active,
              OR: search
                ? [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } },
                  ]
                : undefined,
            },
            select: { id: true, name: true, active: true },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            take: limit + 1,
            skip,
          })
        ).map(({ id, name: label, active }) => ({ id, label, active }));
        break;
    }

    const hasNext = items.length > limit;
    return {
      items: items.slice(0, limit),
      nextCursor: hasNext ? this.encodeCursor(skip + limit) : null,
    };
  }

  private encodeCursor(offset: number): string {
    return Buffer.from(JSON.stringify({ v: 1, offset })).toString('base64url');
  }

  private decodeCursor(value: string): number {
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as { v?: number; offset?: number };
      if (
        parsed.v !== 1 ||
        !Number.isInteger(parsed.offset) ||
        parsed.offset! < 0
      )
        throw new Error();
      return parsed.offset!;
    } catch {
      throw new BadRequestException('Invalid options cursor.');
    }
  }
}
