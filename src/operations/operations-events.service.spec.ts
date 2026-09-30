import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { OperationsEventsService } from './operations-events.service';

describe('Operational SSE wire contract', () => {
  function setup(events: unknown[], enabled = true) {
    const findMany = jest.fn().mockResolvedValue(events);
    const response = Object.assign(new EventEmitter(), {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
    });
    const service = new OperationsEventsService(
      { operationEvent: { findMany } } as never,
      new ConfigService({ OPERATIONS_SSE: enabled }),
    );
    return { service, response, findMany };
  }

  it('writes named events, decimal string ids/versions and related, replaying after the header cursor', async () => {
    const { service, response, findMany } = setup([
      {
        id: 9007199254740993n,
        type: 'table-order.changed',
        entityType: 'TableOrder',
        entityId: 'order-1',
        version: 9007199254740994n,
        related: { restaurantTableId: 'table-1', saleTicketId: 'ticket-1' },
      },
    ]);
    try {
      await service.connect('user-1', 12n, response as unknown as Response);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { gt: 12n } }),
        }),
      );
      expect(response.write.mock.calls.map((call) => call[0]).join('')).toBe(
        'id: 9007199254740993\nevent: table-order.changed\ndata: {"entityType":"TableOrder","entityId":"order-1","version":"9007199254740994","related":{"restaurantTableId":"table-1","saleTicketId":"ticket-1"}}\n\n',
      );
    } finally {
      response.emit('close');
    }
  });

  it('emits resync.required when more than 1000 events need replay', async () => {
    const { service, response } = setup(
      Array.from({ length: 1001 }, (_, index) => ({ id: BigInt(index + 1) })),
    );
    try {
      await service.connect('user-1', 0n, response as unknown as Response);
      expect(response.write).toHaveBeenCalledWith(
        'event: resync.required\ndata: {"reason":"replay_limit"}\n\n',
      );
    } finally {
      response.emit('close');
    }
  });

  it('is unavailable when its feature flag is disabled', async () => {
    const { service, response } = setup([], false);
    await expect(
      service.connect('user-1', 0n, response as unknown as Response),
    ).rejects.toMatchObject({ status: 503 });
    expect(response.flushHeaders).not.toHaveBeenCalled();
  });
});
