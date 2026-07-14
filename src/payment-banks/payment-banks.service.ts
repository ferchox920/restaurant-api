import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../database/prisma.service';
import { CreatePaymentBankDto } from './dto/create-payment-bank.dto';
import { PaymentBankResponseDto } from './dto/payment-bank-response.dto';
import { UpdatePaymentBankDto } from './dto/update-payment-bank.dto';
import { toPaymentBankResponse } from './payment-bank-response.mapper';

@Injectable()
export class PaymentBanksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
  ) {}

  async create(
    dto: CreatePaymentBankDto,
    createdById: string,
  ): Promise<PaymentBankResponseDto> {
    await this.ensureUniqueName(dto.name);

    const paymentBank = await this.runInTransaction(
      async (tx: Prisma.TransactionClient) => {
        const createdPaymentBank = await tx.paymentBank.create({
          data: {
            name: dto.name,
            description: dto.description ?? null,
            createdById,
          },
        });

        await this.auditService.log(
          {
            userId: createdById,
            action: AuditAction.PAYMENT_BANK_CREATED,
            entityType: AuditEntityType.PAYMENT_BANK,
            entityId: createdPaymentBank.id,
            beforeData: null,
            afterData: toPaymentBankResponse(createdPaymentBank),
          },
          tx,
        );

        return createdPaymentBank;
      },
    );

    return toPaymentBankResponse(paymentBank);
  }

  async findAll(
    active?: boolean,
    pagination: PaginationQueryDto = {},
  ): Promise<PaymentBankResponseDto[]> {
    const paymentBanks = await this.prisma.paymentBank.findMany({
      where: typeof active === 'boolean' ? { active } : undefined,
      orderBy: { name: 'asc' },
      ...(pagination.limit !== undefined ? { take: pagination.limit } : {}),
      ...(pagination.offset !== undefined ? { skip: pagination.offset } : {}),
    });

    return paymentBanks.map(toPaymentBankResponse);
  }

  async findOne(id: string): Promise<PaymentBankResponseDto> {
    const paymentBank = await this.prisma.paymentBank.findUnique({
      where: { id },
    });

    if (!paymentBank) {
      throw new NotFoundException(
        `Payment bank with id "${id}" was not found.`,
      );
    }

    return toPaymentBankResponse(paymentBank);
  }

  async update(
    id: string,
    dto: UpdatePaymentBankDto,
    actorUserId?: string,
  ): Promise<PaymentBankResponseDto> {
    const existingPaymentBank = await this.prisma.paymentBank.findUnique({
      where: { id },
    });

    if (!existingPaymentBank) {
      throw new NotFoundException(
        `Payment bank with id "${id}" was not found.`,
      );
    }

    if (dto.name && dto.name !== existingPaymentBank.name) {
      await this.ensureUniqueName(dto.name);
    }

    try {
      const paymentBank = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedPaymentBank = await tx.paymentBank.update({
            where: { id },
            data: {
              name: dto.name,
              description:
                dto.description === undefined ? undefined : dto.description,
            },
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action: AuditAction.PAYMENT_BANK_UPDATED,
              entityType: AuditEntityType.PAYMENT_BANK,
              entityId: updatedPaymentBank.id,
              beforeData: toPaymentBankResponse(existingPaymentBank),
              afterData: toPaymentBankResponse(updatedPaymentBank),
            },
            tx,
          );

          return updatedPaymentBank;
        },
      );

      return toPaymentBankResponse(paymentBank);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  async deactivate(
    id: string,
    actorUserId?: string,
  ): Promise<PaymentBankResponseDto> {
    return this.updateActiveStatus(
      id,
      false,
      actorUserId,
      AuditAction.PAYMENT_BANK_DEACTIVATED,
    );
  }

  async reactivate(
    id: string,
    actorUserId?: string,
  ): Promise<PaymentBankResponseDto> {
    return this.updateActiveStatus(
      id,
      true,
      actorUserId,
      AuditAction.PAYMENT_BANK_REACTIVATED,
    );
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
    actorUserId: string | undefined,
    action: AuditAction,
  ): Promise<PaymentBankResponseDto> {
    const existingPaymentBank = await this.prisma.paymentBank.findUnique({
      where: { id },
    });

    if (!existingPaymentBank) {
      throw new NotFoundException(
        `Payment bank with id "${id}" was not found.`,
      );
    }

    try {
      const paymentBank = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedPaymentBank = await tx.paymentBank.update({
            where: { id },
            data: { active },
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action,
              entityType: AuditEntityType.PAYMENT_BANK,
              entityId: updatedPaymentBank.id,
              beforeData: toPaymentBankResponse(existingPaymentBank),
              afterData: toPaymentBankResponse(updatedPaymentBank),
            },
            tx,
          );

          return updatedPaymentBank;
        },
      );

      return toPaymentBankResponse(paymentBank);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  private async ensureUniqueName(name: string): Promise<void> {
    const existingPaymentBank = await this.prisma.paymentBank.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existingPaymentBank) {
      throw new ConflictException(
        'A payment bank with this name already exists.',
      );
    }
  }

  private handlePrismaNotFound(error: unknown, id: string): never | void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(
        `Payment bank with id "${id}" was not found.`,
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
