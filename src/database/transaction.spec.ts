import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from './prisma.service';
import { runSerializableTransaction } from './transaction';

describe('runSerializableTransaction', () => {
  it('retries serialization conflicts and uses SERIALIZABLE isolation', async () => {
    const tx = { marker: 'transaction-client' };
    const callback = jest.fn().mockResolvedValue('ok');
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(
        new PrismaClientKnownRequestError('serialization conflict', {
          code: 'P2034',
          clientVersion: '6.10.1',
        }),
      )
      .mockImplementationOnce(async (handler) => handler(tx));
    const prisma = {
      $transaction: transaction,
    } as unknown as PrismaService;

    await expect(runSerializableTransaction(prisma, callback)).resolves.toBe(
      'ok',
    );
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenLastCalledWith(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not execute a callback twice when it resolves to undefined', async () => {
    const callback = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      $transaction: jest.fn(async (handler) => handler({})),
    } as unknown as PrismaService;

    await runSerializableTransaction(prisma, callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
