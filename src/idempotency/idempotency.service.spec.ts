import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  const config = { get: jest.fn().mockReturnValue(false) };
  let records: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  let service: IdempotencyService;

  beforeEach(() => {
    records = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    service = new IdempotencyService(
      { idempotencyRecord: records } as never,
      config as never,
    );
  });

  it('keeps the legacy path when no key is supplied and the flag is disabled', async () => {
    const run = jest.fn().mockResolvedValue({ id: 'ticket-1' });
    await expect(
      service.execute({
        userId: 'user-1',
        operation: 'confirm',
        body: {},
        run,
      }),
    ).resolves.toEqual({ id: 'ticket-1' });
    expect(records.create).not.toHaveBeenCalled();
  });

  it('stores a serializable response and reuses completed records', async () => {
    const run = jest
      .fn()
      .mockResolvedValue({ id: 'ticket-1', at: new Date(0) });
    await service.execute({
      key: 'key-1',
      userId: 'user-1',
      operation: 'confirm',
      body: { expectedVersion: '1' },
      run,
    });
    expect(records.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { response: { id: 'ticket-1', at: '1970-01-01T00:00:00.000Z' } },
      }),
    );

    const created = records.create.mock.calls[0][0].data;
    records.findUnique.mockResolvedValue({
      keyHash: created.keyHash,
      requestHash: created.requestHash,
      response: { id: 'ticket-1' },
    });
    await expect(
      service.execute({
        key: 'key-1',
        userId: 'user-1',
        operation: 'confirm',
        body: { expectedVersion: '1' },
        run,
      }),
    ).resolves.toEqual({ id: 'ticket-1' });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('rejects a reused key with a different body', async () => {
    records.findUnique.mockResolvedValue({
      requestHash: 'different',
      response: { id: 'ticket-1' },
    });
    await expect(
      service.execute({
        key: 'key-1',
        userId: 'user-1',
        operation: 'confirm',
        body: {},
        run: jest.fn(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
