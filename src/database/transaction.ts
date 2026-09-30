import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from './prisma.service';

const DEFAULT_TRANSACTION_RETRIES = 3;

export async function runSerializableTransaction<T>(
  prisma: PrismaService,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries = DEFAULT_TRANSACTION_RETRIES,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const transactionResult = prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      if (
        !transactionResult ||
        typeof (transactionResult as Promise<T>).then !== 'function'
      ) {
        throw new Error(
          'Prisma did not provide a transaction; refusing non-atomic execution.',
        );
      }

      return await transactionResult;
    } catch (error) {
      const canRetry =
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < maxRetries;

      if (!canRetry) {
        throw error;
      }
    }
  }

  throw new Error('Serializable transaction retry limit exceeded.');
}
