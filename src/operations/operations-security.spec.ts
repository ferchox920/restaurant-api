import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { OperationsEventsService } from './operations-events.service';
import { CookieAuthGuard } from './cookie-auth.guard';

const identity = {
  id: 'user',
  role: Role.ADMIN as Role,
  sessionJti: 'session',
  sessionExpiresAt: new Date('2099-01-01'),
};
function setup(events: unknown[] = [], authIdentity = identity) {
  const record = {
    userId: authIdentity.id,
    revokedAt: null as Date | null,
    expiresAt: identity.sessionExpiresAt,
    user: { active: true, role: authIdentity.role as Role },
  };
  const prisma = {
    authSession: { findUnique: jest.fn(async () => record) },
    operationEvent: {
      findMany: jest.fn(async () => events),
      findUnique: jest.fn(async () => ({ createdAt: new Date() })),
      findFirst: jest.fn(async () => ({ id: 1n, createdAt: new Date() })),
    },
  };
  const response = Object.assign(new EventEmitter(), {
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn((frame: string) => Boolean(frame)),
    end: jest.fn(),
  });
  const service = new OperationsEventsService(
    prisma as never,
    new ConfigService({ OPERATIONS_SSE: true }),
  );
  return {
    service,
    response,
    prisma,
    record,
    connect: (cursor = 0n) =>
      service.connect(
        authIdentity as never,
        cursor,
        response as unknown as Response,
      ),
  };
}
const wire = (r: ReturnType<typeof setup>['response']) =>
  r.write.mock.calls.map((c) => c[0]).join('');
afterEach(() => jest.useRealTimers());

describe('SSE security and lifecycle regressions', () => {
  it('does not allocate a stream if the socket closes during initial authentication', async () => {
    const s = setup();
    let release!: (record: typeof s.record) => void;
    s.prisma.authSession.findUnique.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const connection = s.connect();
    s.response.emit('close');
    release(s.record);
    try {
      await connection;
      expect(s.response.flushHeaders).not.toHaveBeenCalled();
    } finally {
      s.response.emit('close');
    }
  });
  it('rejects an arbitrary cookie combined with valid bearer authentication', () => {
    const guard = new CookieAuthGuard();
    const request = {
      headers: {
        cookie: 'restaurant_session=arbitrary',
        authorization: 'Bearer signed-token',
      },
      user: identity,
    };
    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as never),
    ).toThrow();
  });
  it('closes revoked sessions within the 3 second bound', async () => {
    jest.useFakeTimers();
    const s = setup();
    try {
      await s.connect();
      s.record.revokedAt = new Date();
      await jest.advanceTimersByTimeAsync(3000);
      expect(s.response.end).toHaveBeenCalled();
    } finally {
      s.response.emit('close');
    }
  });
  it('closes sessions when the user changes role', async () => {
    jest.useFakeTimers();
    const s = setup();
    try {
      await s.connect();
      s.record.user.role = Role.AUDITOR;
      await jest.advanceTimersByTimeAsync(3000);
      expect(s.response.end).toHaveBeenCalled();
    } finally {
      s.response.emit('close');
    }
  });
  it('releases the connection slot on initial database failure', async () => {
    const s = setup();
    s.prisma.operationEvent.findMany.mockRejectedValue(
      new Error('database unavailable'),
    );
    await s.connect().catch(() => undefined);
    expect(
      (s.service as unknown as { connections: Map<string, number> }).connections
        .size,
    ).toBe(0);
    s.response.emit('close');
  });
  it('does not overlap replay reads or emit a frame twice', async () => {
    const s = setup();
    await s.connect();
    let release!: (value: never[]) => void;
    let started!: () => void;
    const startedRead = new Promise<void>((resolve) => {
      started = resolve;
    });
    const delayed = new Promise<never[]>((resolve) => {
      release = resolve;
    });
    s.prisma.operationEvent.findMany.mockImplementationOnce(() => {
      started();
      return delayed;
    });
    const subscribers = (
      s.service as unknown as { wakeSubscribers: Set<() => void> }
    ).wakeSubscribers;
    subscribers.forEach((w) => w());
    subscribers.forEach((w) => w());
    await startedRead;
    const reads = s.prisma.operationEvent.findMany.mock.calls.length;
    release([]);
    await Promise.resolve();
    s.response.emit('close');
    expect(reads).toBe(2);
  });
  it('does not send private event types or arbitrary related fields', async () => {
    const s = setup([
      {
        id: 1n,
        type: 'user.changed',
        entityType: 'User',
        entityId: 'private',
        version: 1n,
        related: { email: 'private@example.com' },
      },
    ]);
    try {
      await s.connect();
      expect(wire(s.response)).not.toContain('private');
    } finally {
      s.response.emit('close');
    }
  });
  it('signals a cursor older than the retention window explicitly', async () => {
    const s = setup();
    s.prisma.operationEvent.findUnique.mockResolvedValue({
      createdAt: new Date('2000-01-01'),
    });
    try {
      await s.connect(1n);
      expect(wire(s.response)).toContain('resync.required');
      expect(wire(s.response)).toContain('cursor_expired');
    } finally {
      s.response.emit('close');
    }
  });
  it('closes all open responses on module destruction', async () => {
    const s = setup();
    try {
      await s.connect();
      await s.service.onModuleDestroy();
      expect(s.response.end).toHaveBeenCalled();
    } finally {
      s.response.emit('close');
    }
  });
  it('rejects an auditor before sending any event', async () => {
    const s = setup([], { ...identity, role: Role.AUDITOR });
    await expect(s.connect()).rejects.toMatchObject({ status: 403 });
    expect(s.response.flushHeaders).not.toHaveBeenCalled();
  });
  it('closes a deactivated user within the bound', async () => {
    jest.useFakeTimers();
    const s = setup();
    try {
      await s.connect();
      s.record.user.active = false;
      await jest.advanceTimersByTimeAsync(3000);
      expect(s.response.end).toHaveBeenCalled();
    } finally {
      s.response.emit('close');
    }
  });
  it('closes at JWT expiry even when the stored session has a later expiry', async () => {
    jest.useFakeTimers();
    const s = setup([], {
      ...identity,
      sessionExpiresAt: new Date(Date.now() + 1000),
    });
    try {
      await s.connect();
      await jest.advanceTimersByTimeAsync(1000);
      expect(s.response.end).toHaveBeenCalled();
    } finally {
      s.response.emit('close');
    }
  });
  it('fails closed within 3 seconds when session storage stops responding', async () => {
    jest.useFakeTimers();
    const s = setup();
    try {
      await s.connect();
      s.prisma.authSession.findUnique.mockImplementation(
        () => new Promise(() => undefined),
      );
      await jest.advanceTimersByTimeAsync(3000);
      expect(s.response.end).toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      s.response.emit('close');
    }
  });
  it('releases timers, subscribers and slots after a write failure', async () => {
    jest.useFakeTimers();
    const s = setup([
      {
        id: 1n,
        type: 'table-order.changed',
        entityType: 'TableOrder',
        entityId: 'order',
        version: 1n,
        related: null,
      },
    ]);
    s.response.write.mockImplementation(() => {
      throw new Error('broken socket');
    });
    await s.connect();
    expect(s.response.end).toHaveBeenCalled();
    expect(
      (s.service as unknown as { connections: Map<string, number> }).connections
        .size,
    ).toBe(0);
    expect(
      (s.service as unknown as { wakeSubscribers: Set<() => void> })
        .wakeSubscribers.size,
    ).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('strips unrestricted related fields and hides inventory events from cashier', async () => {
    const s = setup(
      [
        {
          id: 1n,
          type: 'inventory.changed',
          entityType: 'ProductStock',
          entityId: 'restricted',
          version: 1n,
          related: null,
        },
        {
          id: 2n,
          type: 'table-order.changed',
          entityType: 'TableOrder',
          entityId: 'order',
          version: 9007199254740993n,
          related: {
            saleTicketId: 'ticket',
            email: 'secret@example.com',
            cost: '999',
            userId: 'private',
          },
        },
      ],
      { ...identity, role: Role.CASHIER },
    );
    try {
      await s.connect();
      const content = wire(s.response);
      expect(content).not.toMatch(/restricted|secret|cost|private/);
      expect(content).toContain('"version":"9007199254740993"');
      expect(content).toContain('"saleTicketId":"ticket"');
    } finally {
      s.response.emit('close');
    }
  });
  it('keeps the three-connection limit and releases a disconnected slot', async () => {
    const s = setup();
    try {
      await s.connect();
      await s.connect();
      await s.connect();
      await expect(s.connect()).rejects.toMatchObject({ status: 503 });
      s.response.emit('close');
      expect(
        (s.service as unknown as { connections: Map<string, number> })
          .connections.size,
      ).toBe(0);
      await s.connect();
    } finally {
      s.response.emit('close');
    }
  });
  it('resynchronizes an unknown cursor using a string current cursor', async () => {
    const s = setup();
    s.prisma.operationEvent.findUnique.mockResolvedValue(null as never);
    try {
      await s.connect(9007199254740993n);
      expect(wire(s.response)).toContain('id: 1\nevent: resync.required');
      expect(wire(s.response)).toContain('cursor_unknown');
    } finally {
      s.response.emit('close');
    }
  });
});
