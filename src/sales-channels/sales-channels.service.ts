import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { CommissionType } from './sales-channel.enums';
import { toSalesChannelResponse } from './sales-channel-response.mapper';
import { CreateSalesChannelDto } from './dto/create-sales-channel.dto';
import { UpdateSalesChannelDto } from './dto/update-sales-channel.dto';
import { SalesChannelResponseDto } from './dto/sales-channel-response.dto';

@Injectable()
export class SalesChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createSalesChannelDto: CreateSalesChannelDto,
    createdById: string,
  ): Promise<SalesChannelResponseDto> {
    await this.ensureUniqueFields(
      createSalesChannelDto.name,
      createSalesChannelDto.code,
    );

    const commissionType =
      createSalesChannelDto.commissionType ?? CommissionType.NONE;
    const commissionValue = createSalesChannelDto.commissionValue ?? 0;

    this.validateCommissionRules(commissionType, commissionValue);

    const salesChannel = await this.prisma.salesChannel.create({
      data: {
        name: createSalesChannelDto.name,
        code: createSalesChannelDto.code,
        description: createSalesChannelDto.description ?? null,
        commissionType,
        commissionValue,
        createdById,
      },
    });

    return toSalesChannelResponse(salesChannel);
  }

  async findAll(active?: boolean): Promise<SalesChannelResponseDto[]> {
    const salesChannels = await this.prisma.salesChannel.findMany({
      where: typeof active === 'boolean' ? { active } : undefined,
      orderBy: { name: 'asc' },
    });

    return salesChannels.map(toSalesChannelResponse);
  }

  async findOne(id: string): Promise<SalesChannelResponseDto> {
    const salesChannel = await this.prisma.salesChannel.findUnique({
      where: { id },
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
  ): Promise<SalesChannelResponseDto> {
    const existingSalesChannel = await this.prisma.salesChannel.findUnique({
      where: { id },
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

    const commissionType =
      updateSalesChannelDto.commissionType ?? existingSalesChannel.commissionType;
    const commissionValue =
      updateSalesChannelDto.commissionValue ??
      Number(existingSalesChannel.commissionValue);

    this.validateCommissionRules(commissionType, commissionValue);

    try {
      const salesChannel = await this.prisma.salesChannel.update({
        where: { id },
        data: {
          ...updateSalesChannelDto,
          description:
            updateSalesChannelDto.description === undefined
              ? undefined
              : updateSalesChannelDto.description,
          commissionType,
          commissionValue,
        },
      });

      return toSalesChannelResponse(salesChannel);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  async deactivate(id: string): Promise<SalesChannelResponseDto> {
    return this.updateActiveStatus(id, false);
  }

  async reactivate(id: string): Promise<SalesChannelResponseDto> {
    return this.updateActiveStatus(id, true);
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
  ): Promise<SalesChannelResponseDto> {
    try {
      const salesChannel = await this.prisma.salesChannel.update({
        where: { id },
        data: { active },
      });

      return toSalesChannelResponse(salesChannel);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
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

  private validateCommissionRules(
    commissionType: CommissionType,
    commissionValue: number,
  ): void {
    if (commissionType === CommissionType.NONE && commissionValue !== 0) {
      throw new BadRequestException(
        'commissionValue must be 0 when commissionType is NONE.',
      );
    }

    if (
      commissionType === CommissionType.PERCENTAGE &&
      (commissionValue < 0 || commissionValue > 100)
    ) {
      throw new BadRequestException(
        'commissionValue must be between 0 and 100 when commissionType is PERCENTAGE.',
      );
    }

    if (commissionType === CommissionType.FIXED && commissionValue < 0) {
      throw new BadRequestException(
        'commissionValue must be greater than or equal to 0 when commissionType is FIXED.',
      );
    }
  }

  private handlePrismaNotFound(error: unknown, id: string): never | void {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(
        `Sales channel with id "${id}" was not found.`,
      );
    }
  }
}
