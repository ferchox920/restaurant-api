import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from './prisma.service';
import { runSerializableTransaction } from './transaction';

describe('runSerializableTransaction', () => {
  it('fails explicitly without a transaction instead of running the callback', async () => {
    const callback = jest.fn().mockResolvedValue('unsafe');
    const prisma = { $transaction: jest.fn() } as unknown as PrismaService;
    await expect(
      runSerializableTransaction(prisma, callback),
    ).rejects.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });
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

  it('bounds conflict retries and propagates other database failures', async () => {
    const conflict = new PrismaClientKnownRequestError('conflict', {
      code: 'P2034',
      clientVersion: '6.19.3',
    });
    const transaction = jest.fn().mockRejectedValue(conflict);
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    await expect(runSerializableTransaction(prisma, jest.fn(), 2)).rejects.toBe(
      conflict,
    );
    expect(transaction).toHaveBeenCalledTimes(3);
    transaction
      .mockReset()
      .mockRejectedValue(new Error('database unavailable'));
    await expect(runSerializableTransaction(prisma, jest.fn())).rejects.toThrow(
      'database unavailable',
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
