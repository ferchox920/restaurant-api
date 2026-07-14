import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../database/prisma.service';
import { CommissionType } from './sales-channel.enums';
import { toSalesChannelResponse } from './sales-channel-response.mapper';
import { CreateSalesChannelDto } from './dto/create-sales-channel.dto';
import { UpdateSalesChannelDto } from './dto/update-sales-channel.dto';
import { SalesChannelResponseDto } from './dto/sales-channel-response.dto';
import { SalesChannelSubTaxInputDto } from './dto/sales-channel-sub-tax.dto';

const salesChannelInclude = {
  subTaxes: {
    orderBy: { name: 'asc' as const },
  },
};

@Injectable()
export class SalesChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
  ) {}

  async create(
    createSalesChannelDto: CreateSalesChannelDto,
    createdById: string,
  ): Promise<SalesChannelResponseDto> {
    await this.ensureUniqueFields(
      createSalesChannelDto.name,
      createSalesChannelDto.code,
    );

    const subTaxes = createSalesChannelDto.subTaxes ?? [];

    this.validateSubTaxes(subTaxes);

    const salesChannel = await this.runInTransaction(
      async (tx: Prisma.TransactionClient) => {
        const createdSalesChannel = await tx.salesChannel.create({
          data: {
            name: createSalesChannelDto.name,
            code: createSalesChannelDto.code,
            description: createSalesChannelDto.description ?? null,
            commissionType: CommissionType.NONE,
            commissionValue: 0,
            createdById,
            subTaxes: {
              create: subTaxes.map((subTax) => ({
                name: subTax.name,
                percentage: subTax.percentage,
              })),
            },
          },
          include: salesChannelInclude,
        });

        await this.auditService.log(
          {
            userId: createdById,
            action: AuditAction.SALES_CHANNEL_CREATED,
            entityType: AuditEntityType.SALES_CHANNEL,
            entityId: createdSalesChannel.id,
            beforeData: null,
            afterData: toSalesChannelResponse(createdSalesChannel),
          },
          tx,
        );

        return createdSalesChannel;
      },
    );

    return toSalesChannelResponse(salesChannel);
  }

  async findAll(
    active?: boolean,
    pagination: PaginationQueryDto = {},
  ): Promise<SalesChannelResponseDto[]> {
    const salesChannels = await this.prisma.salesChannel.findMany({
      where: typeof active === 'boolean' ? { active } : undefined,
      orderBy: { name: 'asc' },
      ...(pagination.limit !== undefined ? { take: pagination.limit } : {}),
      ...(pagination.offset !== undefined ? { skip: pagination.offset } : {}),
      include: salesChannelInclude,
    });

    return salesChannels.map(toSalesChannelResponse);
  }

  async findOne(id: string): Promise<SalesChannelResponseDto> {
    const salesChannel = await this.prisma.salesChannel.findUnique({
      where: { id },
      include: salesChannelInclude,
    });

    if (!salesChannel) {
      throw new NotFoundException(
        `Sales channel with id "${id}" was not found.`,
      );
    }

    return toSalesChannelResponse(salesChannel);
  }

  async update(
    id: string,
    updateSalesChannelDto: UpdateSalesChannelDto,
    actorUserId?: string,
  ): Promise<SalesChannelResponseDto> {
    const existingSalesChannel = await this.prisma.salesChannel.findUnique({
      where: { id },
      include: salesChannelInclude,
    });

    if (!existingSalesChannel) {
      throw new NotFoundException(
        `Sales channel with id "${id}" was not found.`,
      );
    }

    if (
      updateSalesChannelDto.name &&
      updateSalesChannelDto.name !== existingSalesChannel.name
    ) {
      const duplicatedName = await this.prisma.salesChannel.findUnique({
        where: { name: updateSalesChannelDto.name },
        select: { id: true },
      });

      if (duplicatedName) {
        throw new ConflictException(
          'A sales channel with this name already exists.',
        );
      }
    }

    if (
      updateSalesChannelDto.code &&
      updateSalesChannelDto.code !== existingSalesChannel.code
    ) {
      const duplicatedCode = await this.prisma.salesChannel.findUnique({
        where: { code: updateSalesChannelDto.code },
        select: { id: true },
      });

      if (duplicatedCode) {
        throw new ConflictException(
          'A sales channel with this code already exists.',
        );
      }
    }

    this.validateSubTaxes(updateSalesChannelDto.subTaxes);

    const { subTaxes, ...salesChannelData } = updateSalesChannelDto;

    try {
      const salesChannel = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedSalesChannel = await tx.salesChannel.update({
            where: { id },
            data: {
              ...salesChannelData,
              description:
                updateSalesChannelDto.description === undefined
                  ? undefined
                  : updateSalesChannelDto.description,
              commissionType: CommissionType.NONE,
              commissionValue: 0,
              subTaxes:
                subTaxes === undefined
                  ? undefined
                  : {
                      deleteMany: {},
                      create: subTaxes.map((subTax) => ({
                        name: subTax.name,
                        percentage: subTax.percentage,
                      })),
                    },
            },
            include: salesChannelInclude,
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action: AuditAction.SALES_CHANNEL_UPDATED,
              entityType: AuditEntityType.SALES_CHANNEL,
              entityId: updatedSalesChannel.id,
              beforeData: existingSalesChannel
                ? toSalesChannelResponse(existingSalesChannel)
                : null,
              afterData: toSalesChannelResponse(updatedSalesChannel),
            },
            tx,
          );

          return updatedSalesChannel;
        },
      );

      return toSalesChannelResponse(salesChannel);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  async deactivate(
    id: string,
    actorUserId?: string,
  ): Promise<SalesChannelResponseDto> {
    return this.updateActiveStatus(
      id,
      false,
      actorUserId,
      AuditAction.SALES_CHANNEL_DEACTIVATED,
    );
  }

  async reactivate(
    id: string,
    actorUserId?: string,
  ): Promise<SalesChannelResponseDto> {
    return this.updateActiveStatus(
      id,
      true,
      actorUserId,
      AuditAction.SALES_CHANNEL_REACTIVATED,
    );
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
    actorUserId: string | undefined,
    action: AuditAction,
  ): Promise<SalesChannelResponseDto> {
    const existingSalesChannel = await this.findSalesChannel(id);

    try {
      const salesChannel = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedSalesChannel = await tx.salesChannel.update({
            where: { id },
            data: { active },
            include: salesChannelInclude,
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action,
              entityType: AuditEntityType.SALES_CHANNEL,
              entityId: updatedSalesChannel.id,
              beforeData: existingSalesChannel
                ? toSalesChannelResponse(existingSalesChannel)
                : null,
              afterData: toSalesChannelResponse(updatedSalesChannel),
            },
            tx,
          );

          return updatedSalesChannel;
        },
      );

      return toSalesChannelResponse(salesChannel);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  private async getSalesChannelOrThrow(id: string) {
    const salesChannel = await this.findSalesChannel(id);

    if (!salesChannel) {
      throw new NotFoundException(
        `Sales channel with id "${id}" was not found.`,
      );
    }

    return salesChannel;
  }

  private findSalesChannel(id: string) {
    return this.prisma.salesChannel.findUnique({
      where: { id },
      include: salesChannelInclude,
    });
  }

  private async ensureUniqueFields(name: string, code: string): Promise<void> {
    const [existingByName, existingByCode] = await Promise.all([
      this.prisma.salesChannel.findUnique({
        where: { name },
        select: { id: true },
      }),
      this.prisma.salesChannel.findUnique({
        where: { code },
        select: { id: true },
      }),
    ]);

    if (existingByName) {
      throw new ConflictException(
        'A sales channel with this name already exists.',
      );
    }

    if (existingByCode) {
      throw new ConflictException(
        'A sales channel with this code already exists.',
      );
    }
  }

  private validateSubTaxes(
    subTaxes: SalesChannelSubTaxInputDto[] | undefined,
  ): void {
    if (!subTaxes) {
      return;
    }

    const names = new Set<string>();

    for (const subTax of subTaxes) {
      const normalizedName = subTax.name.trim().toLowerCase();

      if (!normalizedName) {
        throw new BadRequestException('subTaxes.name cannot be empty.');
      }

      if (names.has(normalizedName)) {
        throw new BadRequestException(
          'subTaxes cannot contain duplicated names for the same sales channel.',
        );
      }

      names.add(normalizedName);
    }
  }

  private handlePrismaNotFound(error: unknown, id: string): never | void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(
        `Sales channel with id "${id}" was not found.`,
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
