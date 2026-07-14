import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { TableResponseDto } from './dto/table-response.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { toTableResponse } from './table-response.mapper';

const tableInclude = {
  orders: {
    where: {
      status: 'OPEN',
    },
    select: {
      id: true,
      saleTicketId: true,
      openedAt: true,
      notes: true,
    },
    take: 1,
  },
} satisfies Prisma.RestaurantTableInclude;

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
  ) {}

  async create(
    dto: CreateTableDto,
    createdById: string,
  ): Promise<TableResponseDto> {
    await this.ensureCodeAvailable(dto.code);

    try {
      const table = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const createdTable = await tx.restaurantTable.create({
            data: {
              code: dto.code,
              name: dto.name ?? null,
              area: dto.area ?? null,
              capacity: dto.capacity ?? null,
              createdById,
            },
            include: tableInclude,
          });

          await this.auditService.log(
            {
              userId: createdById,
              action: AuditAction.RESTAURANT_TABLE_CREATED,
              entityType: AuditEntityType.RESTAURANT_TABLE,
              entityId: createdTable.id,
              beforeData: null,
              afterData: toTableResponse(createdTable),
            },
            tx,
          );

          return createdTable;
        },
      );

      return toTableResponse(table);
    } catch (error) {
      this.handlePrismaConflict(error);
      throw error;
    }
  }

  async findAll(
    filters: {
      active?: boolean;
      area?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<TableResponseDto[]> {
    const tables = await this.prisma.restaurantTable.findMany({
      where: {
        active:
          typeof filters.active === 'boolean' ? filters.active : undefined,
        area: filters.area
          ? {
              equals: filters.area,
              mode: 'insensitive',
            }
          : undefined,
        OR: filters.search
          ? [
              {
                code: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                name: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                area: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      include: tableInclude,
      orderBy: { code: 'asc' },
      ...(filters.limit !== undefined ? { take: filters.limit } : {}),
      ...(filters.offset !== undefined ? { skip: filters.offset } : {}),
    });

    return tables.map(toTableResponse);
  }

  async findOne(id: string): Promise<TableResponseDto> {
    const table = await this.getTableOrThrow(id);
    return toTableResponse(table);
  }

  async update(
    id: string,
    dto: UpdateTableDto,
    actorUserId?: string,
  ): Promise<TableResponseDto> {
    const existingTable = await this.getTableOrThrow(id);

    if (dto.code) {
      await this.ensureCodeAvailable(dto.code, id);
    }

    try {
      const table = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedTable = await tx.restaurantTable.update({
            where: { id },
            data: {
              code: dto.code,
              name: dto.name,
              area: dto.area,
              capacity: dto.capacity,
            },
            include: tableInclude,
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action: AuditAction.RESTAURANT_TABLE_UPDATED,
              entityType: AuditEntityType.RESTAURANT_TABLE,
              entityId: updatedTable.id,
              beforeData: toTableResponse(existingTable),
              afterData: toTableResponse(updatedTable),
            },
            tx,
          );

          return updatedTable;
        },
      );

      return toTableResponse(table);
    } catch (error) {
      this.handlePrismaConflict(error);
      throw error;
    }
  }

  async deactivate(
    id: string,
    actorUserId?: string,
  ): Promise<TableResponseDto> {
    return this.updateActiveStatus(
      id,
      false,
      actorUserId,
      AuditAction.RESTAURANT_TABLE_DEACTIVATED,
    );
  }

  async reactivate(
    id: string,
    actorUserId?: string,
  ): Promise<TableResponseDto> {
    return this.updateActiveStatus(
      id,
      true,
      actorUserId,
      AuditAction.RESTAURANT_TABLE_REACTIVATED,
    );
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
    actorUserId: string | undefined,
    action: AuditAction,
  ): Promise<TableResponseDto> {
    const existingTable = await this.getTableOrThrow(id);

    const table = await this.runInTransaction(
      async (tx: Prisma.TransactionClient) => {
        const updatedTable = await tx.restaurantTable.update({
          where: { id },
          data: { active },
          include: tableInclude,
        });

        await this.auditService.log(
          {
            userId: actorUserId,
            action,
            entityType: AuditEntityType.RESTAURANT_TABLE,
            entityId: updatedTable.id,
            beforeData: toTableResponse(existingTable),
            afterData: toTableResponse(updatedTable),
          },
          tx,
        );

        return updatedTable;
      },
    );

    return toTableResponse(table);
  }

  private async getTableOrThrow(id: string) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id },
      include: tableInclude,
    });

    if (!table) {
      throw new NotFoundException(
        `Restaurant table with id "${id}" was not found.`,
      );
    }

    return table;
  }

  private async ensureCodeAvailable(
    code: string,
    currentId?: string,
  ): Promise<void> {
    const existingTable = await this.prisma.restaurantTable.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existingTable && existingTable.id !== currentId) {
      throw new ConflictException(
        'A restaurant table with this code already exists.',
      );
    }
  }

  private handlePrismaConflict(error: unknown): never | void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A restaurant table with this code already exists.',
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

    return transactionResult;
  }
}
