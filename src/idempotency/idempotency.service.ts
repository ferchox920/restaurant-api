import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, IdempotencyRecord } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { runSerializableTransaction } from '../database/transaction';

@Injectable()
export class IdempotencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async execute<T>(input: {
    key?: string;
    userId: string;
    operation: string;
    body: unknown;
    run: (tx: Prisma.TransactionClient) => Promise<T>;
  }): Promise<T> {
    if (!input.key) {
      if (this.config.get<boolean>('OPTIMISTIC_VERSIONING'))
        throw new BadRequestException('Idempotency-Key is required.');
      return runSerializableTransaction(this.prisma, input.run);
    }
    const keyHash = this.hash(
      `${input.userId}:${input.operation}:${input.key}`,
    );
    const requestHash = this.hash(
      JSON.stringify(this.canonicalize(input.body)),
    );
    const legacyRequestHash = this.hash(JSON.stringify(input.body));
    try {
      return await runSerializableTransaction(this.prisma, async (tx) => {
        const existing = await tx.idempotencyRecord.findUnique({
          where: { keyHash },
        });
        if (existing)
          return this.replay<T>(existing, requestHash, legacyRequestHash);
        await tx.idempotencyRecord.create({
          data: {
            keyHash,
            requestHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        const response = await input.run(tx);
        const serializableResponse = JSON.parse(
          JSON.stringify(response),
        ) as Prisma.InputJsonValue;
        await tx.idempotencyRecord.update({
          where: { keyHash },
          data: { response: serializableResponse },
        });
        // Initial response and replay have identical JSON shapes, including dates.
        return serializableResponse as T;
      });
    } catch (error) {
      if (
        !(error instanceof PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      // The losing transaction has rolled back; read its winner, never run again.
      const existing = await this.prisma.idempotencyRecord.findUnique({
        where: { keyHash },
      });
      if (!existing) throw error;
      return this.replay<T>(existing, requestHash, legacyRequestHash);
    }
  }

  private replay<T>(
    record: IdempotencyRecord,
    requestHash: string,
    legacyRequestHash: string,
  ): T {
    if (
      record.requestHash !== requestHash &&
      record.requestHash !== legacyRequestHash
    )
      throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED' });
    if (record.response !== null) return record.response as T;
    // Retain completed keys after expiresAt. Legacy incomplete records require
    // reconciliation; expiry never authorizes repeating committed effects.
    throw new ConflictException({
      code:
        record.expiresAt <= new Date()
          ? 'IDEMPOTENCY_RECOVERY_REQUIRED'
          : 'IDEMPOTENCY_IN_PROGRESS',
    });
  }

  private canonicalize(value: unknown): unknown {
    if (Array.isArray(value))
      return value.map((item) => this.canonicalize(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, this.canonicalize(item)]),
      );
    }
    return value;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
