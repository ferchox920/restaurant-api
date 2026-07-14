import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AUDIT_DEFAULT_LIMIT,
  AUDIT_MAX_LIMIT,
  AUDIT_SENSITIVE_FIELD_NAMES,
} from './audit.constants';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { toAuditLogResponse } from './mappers/audit-log-response.mapper';
import { CreateAuditLogInput } from './types/create-audit-log-input.type';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    input: CreateAuditLogInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const prisma = tx ?? this.prisma;

    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeData: this.sanitizeValue(input.beforeData),
        afterData: this.sanitizeValue(input.afterData),
        metadata: this.sanitizeValue(input.metadata),
      },
    });
  }

  async findAll(query: AuditLogQueryDto): Promise<AuditLogResponseDto[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId: query.userId,
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId,
        createdAt:
          query.from || query.to
            ? {
                gte: query.from,
                lte: query.to,
              }
            : undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(query.limit ?? AUDIT_DEFAULT_LIMIT, AUDIT_MAX_LIMIT),
      skip: query.offset ?? 0,
    });

    return logs.map(toAuditLogResponse);
  }

  async findOne(id: string): Promise<AuditLogResponseDto> {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    if (!auditLog) {
      throw new NotFoundException(`Audit log with id "${id}" was not found.`);
    }

    return toAuditLogResponse(auditLog);
  }

  sanitizeValue(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return this.sanitizeRecursive(value) as Prisma.InputJsonValue;
  }

  private sanitizeRecursive(value: unknown): unknown {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeRecursive(item));
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !this.isSensitiveField(key))
        .map(([key, nestedValue]) => [
          key,
          this.sanitizeRecursive(nestedValue),
        ]);

      return Object.fromEntries(entries);
    }

    return String(value);
  }

  private isSensitiveField(fieldName: string): boolean {
    const normalizedFieldName = fieldName
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
    return AUDIT_SENSITIVE_FIELD_NAMES.has(normalizedFieldName);
  }
}
