import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';

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
    run: () => Promise<T>;
  }): Promise<T> {
    if (!input.key) {
      if (this.config.get<boolean>('OPTIMISTIC_VERSIONING')) {
        throw new BadRequestException('Idempotency-Key is required.');
      }
      return input.run();
    }

    const keyHash = this.hash(
      `${input.userId}:${input.operation}:${input.key}`,
    );
    const requestHash = this.hash(JSON.stringify(input.body));
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { keyHash },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED' });
      }
      if (existing.response !== null) return existing.response as T;
      throw new ConflictException({ code: 'IDEMPOTENCY_IN_PROGRESS' });
    }

    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          keyHash,
          requestHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      if (
        !(error instanceof PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
      const concurrent = await this.prisma.idempotencyRecord.findUnique({
        where: { keyHash },
      });
      if (concurrent?.requestHash !== requestHash) {
        throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED' });
      }
      if (concurrent.response !== null) return concurrent.response as T;
      throw new ConflictException({ code: 'IDEMPOTENCY_IN_PROGRESS' });
    }
    try {
      const response = await input.run();
      const serializableResponse = JSON.parse(
        JSON.stringify(response),
      ) as Prisma.InputJsonValue;
      await this.prisma.idempotencyRecord.update({
        where: { keyHash },
        data: { response: serializableResponse },
      });
      return response;
    } catch (error) {
      await this.prisma.idempotencyRecord.deleteMany({
        where: { keyHash, response: { equals: Prisma.DbNull } },
      });
      throw error;
    }
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
