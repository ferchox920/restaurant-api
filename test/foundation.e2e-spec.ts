import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { Prisma, Role, ProductUnit, StockManagementType } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { SalesService } from '../src/sales/sales.service';
import { TableOrdersService } from '../src/table-orders/table-orders.service';
import { IdempotencyService } from '../src/idempotency/idempotency.service';
import { SalesController } from '../src/sales/sales.controller';

// Only proxies timing/fault boundaries; all business reads/writes use PostgreSQL.
type Hook = (model: string, method: string, result: unknown) => Promise<void>;
const prisma = new PrismaService();
const config = new ConfigService({
  OPERATIONS_SSE: true,
  OPTIMISTIC_VERSIONING: false,
});
const audit = new AuditService(prisma);
const inventory = new InventoryService(prisma, audit);
const sales = new SalesService(prisma, inventory, audit, config);
const orders = new TableOrdersService(prisma, sales, audit, config);
const idem = new IdempotencyService(prisma, config);
const controller = new SalesController(sales, idem);

describe('Backend foundation PostgreSQL guarantees', () => {
  let userId: string;
  let channelId: string;
  let productId: string;
  let tableId: string;
  let runId: string;
  let app: INestApplication;
  let baseUrl: string;
  let token: string;
  let recordHashes: string[];

  beforeAll(async () => {
    await prisma.$connect();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    app.get(ConfigService).set('OPERATIONS_SSE', true);
  });
  beforeEach(async () => {
    runId = crypto.randomUUID();
    recordHashes = [];
    userId = (
      await prisma.user.create({
        data: {
          email: `${runId}@example.com`,
          passwordHash: 'unused',
          firstName: 'Test',
          lastName: 'Foundation',
          role: Role.ADMIN,
        },
      })
    ).id;
    channelId = (
      await prisma.salesChannel.create({ data: { name: runId, code: runId } })
    ).id;
    productId = (
      await prisma.product.create({
        data: {
          name: runId,
          sku: runId,
          unit: ProductUnit.UNIT,
          stockManagementType: StockManagementType.FINISHED_PRODUCT,
          stock: { create: { currentStock: 5 } },
          costHistory: { create: { cost: 2, validFrom: new Date(0) } },
          priceHistory: {
            create: {
              salesChannelId: channelId,
              price: 10,
              validFrom: new Date(0),
            },
          },
        },
      })
    ).id;
    tableId = (await prisma.restaurantTable.create({ data: { code: runId } }))
      .id;
    token = await app.get(JwtService).signAsync({
      sub: userId,
      email: `${runId}@example.com`,
      role: Role.ADMIN,
    });
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    const tickets = await prisma.saleTicket.findMany({
      where: { salesChannelId: channelId },
      select: { id: true },
    });
    const ids = tickets.map((t) => t.id);
    const orderIds = (
      await prisma.tableOrder.findMany({
        where: { restaurantTableId: tableId },
        select: { id: true },
      })
    ).map((order) => order.id);
    await prisma.idempotencyRecord.deleteMany({
      where: { keyHash: { in: recordHashes } },
    });
    await prisma.idempotencyRecord.deleteMany({
      where: {
        keyHash: {
          in: [...ids, ...orderIds].flatMap((id) =>
            [
              'sale-ticket.confirm',
              'sale-ticket.void',
              'table-order.close',
            ].map((operation) =>
              createHash('sha256')
                .update(`${userId}:${operation}:${id}:${runId}`)
                .digest('hex'),
            ),
          ),
        },
      },
    });
    await prisma.operationEvent.deleteMany({
      where: {
        OR: [
          { entityId: { in: ids } },
          { related: { path: ['restaurantTableId'], equals: tableId } },
          { entityId: productId },
        ],
      },
    });
    await prisma.tableOrder.deleteMany({
      where: { restaurantTableId: tableId },
    });
    await prisma.saleTicket.deleteMany({ where: { id: { in: ids } } });
    await prisma.inventoryMovement.deleteMany({ where: { productId } });
    await prisma.productStock.deleteMany({ where: { productId } });
    await prisma.productPriceHistory.deleteMany({ where: { productId } });
    await prisma.productCostHistory.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.restaurantTable.delete({ where: { id: tableId } });
    await prisma.salesChannel.delete({ where: { id: channelId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.authSession.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });
  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  async function request(
    path: string,
    body?: unknown,
    method = 'POST',
    key?: string,
  ) {
    const response = await fetch(`${baseUrl}/api/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (response.status === 409) throw new ConflictException(data);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    return data;
  }

  function instrument(hook: Hook) {
    const transaction = prisma.$transaction.bind(prisma);
    jest.spyOn(prisma, '$transaction').mockImplementation(((
      callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
      options: object,
    ) =>
      transaction(async (tx) => {
        const proxy = new Proxy(tx, {
          get(target, model: string) {
            const delegate = Reflect.get(target, model);
            if (model.startsWith('$') || model.startsWith('_'))
              return typeof delegate === 'function'
                ? delegate.bind(target)
                : delegate;
            if (!delegate || typeof delegate !== 'object') return delegate;
            return new Proxy(delegate, {
              get(value, method: string) {
                const fn = Reflect.get(value, method);
                if (typeof fn !== 'function') return fn;
                return async (...args: unknown[]) => {
                  const result = await fn.apply(value, args);
                  await hook(model, method, result);
                  return result;
                };
              },
            });
          },
        });
        return callback(proxy);
      }, options)) as typeof prisma.$transaction);
  }
  function overlap(modelName: string, methodName: string) {
    let arrivals = 0;
    let release!: () => void;
    const both = new Promise<void>((resolve) => {
      release = resolve;
    });
    instrument(async (model, method) => {
      if (model !== modelName || method !== methodName || arrivals >= 2) return;
      arrivals++;
      if (arrivals === 2) release();
      await both;
    });
    return () => expect(arrivals).toBe(2);
  }
  async function ticket(quantity = 2) {
    const draft = await sales.create({ salesChannelId: channelId }, userId);
    return sales.addItem(draft.id, { productId, quantity }, userId);
  }
  async function order() {
    const opened = await orders.open(
      tableId,
      { salesChannelId: channelId },
      userId,
    );
    return orders.addItem(opened.id, { productId, quantity: 2 }, userId);
  }
  function confirm(
    id: string,
    key = runId,
    body = { paymentMethod: 'CASH' as const },
  ) {
    return controller.confirm(id, body, { id: userId } as never, key);
  }
  async function stock() {
    return (
      await prisma.productStock.findUniqueOrThrow({ where: { productId } })
    ).currentStock.toString();
  }
  async function counts() {
    const tickets = await prisma.saleTicket.findMany({
      where: { salesChannelId: channelId },
      select: { id: true },
    });
    return {
      movements: await prisma.inventoryMovement.count({ where: { productId } }),
      audits: await prisma.auditLog.count({ where: { userId } }),
      events: await prisma.operationEvent.count({
        where: {
          OR: [
            { entityId: { in: [productId, ...tickets.map((t) => t.id)] } },
            { related: { path: ['restaurantTableId'], equals: tableId } },
          ],
        },
      }),
    };
  }

  it('rolls back commercial effects when persisting the idempotent response fails, then retries safely', async () => {
    const draft = await ticket();
    const before = await counts();
    jest
      .spyOn(prisma.idempotencyRecord, 'update')
      .mockRejectedValueOnce(new Error('response persistence fault'));
    instrument(async (model, method) => {
      if (model === 'idempotencyRecord' && method === 'update')
        throw new Error('response persistence fault');
    });
    await expect(confirm(draft.id)).rejects.toThrow(
      'response persistence fault',
    );
    expect(await stock()).toBe('5');
    expect(await counts()).toEqual(before);
    expect((await sales.findOne(draft.id)).status).toBe('DRAFT');
    jest.restoreAllMocks();
    const result = await confirm(draft.id);
    expect(await confirm(draft.id)).toEqual(JSON.parse(JSON.stringify(result)));
    expect(await stock()).toBe('3');
  });

  it('increments the comanda version when removing a consumption', async () => {
    const current = await order();
    const updated = await orders.removeItem(
      current.id,
      current.saleTicket.items[0].id,
      userId,
    );
    expect(updated.version).toBe((BigInt(current.version) + 1n).toString());
    expect(updated.saleTicket.total).toBe('0');
  });

  it('rolls back items, totals and audit when the comanda version update fails', async () => {
    const current = await order();
    const before = await counts();
    jest
      .spyOn(prisma.tableOrder, 'update')
      .mockRejectedValueOnce(new Error('comanda fault'));
    instrument(async (model, method) => {
      if (model === 'tableOrder' && method === 'update')
        throw new Error('comanda fault');
    });
    await expect(
      orders.addItem(current.id, { productId, quantity: 1 }, userId),
    ).rejects.toThrow('comanda fault');
    expect(await orders.findOne(current.id)).toEqual(current);
    expect(await counts()).toEqual(before);
  });

  it('opens exactly one order when requests overlap', async () => {
    const assertOverlap = overlap('tableOrder', 'findFirst');
    const results = await Promise.allSettled([
      request(`tables/${tableId}/orders/open`, { salesChannelId: channelId }),
      request(`tables/${tableId}/orders/open`, { salesChannelId: channelId }),
    ]);
    assertOverlap();
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      await prisma.tableOrder.count({
        where: { restaurantTableId: tableId, status: 'OPEN' },
      }),
    ).toBe(1);
    expect(
      await prisma.saleTicket.count({ where: { salesChannelId: channelId } }),
    ).toBe(1);
  });

  it('rejects one of two edits using the same comanda version', async () => {
    const current = await order();
    const assertOverlap = overlap('tableOrder', 'findUnique');
    const results = await Promise.allSettled(
      [1, 3].map((quantity) =>
        request(
          `table-orders/${current.id}/items/${current.saleTicket.items[0].id}`,
          { quantity, expectedVersion: current.version },
          'PATCH',
        ),
      ),
    );
    assertOverlap();
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(ConflictException);
    expect((await orders.findOne(current.id)).version).toBe(
      (BigInt(current.version) + 1n).toString(),
    );
  });

  it.each(['update', 'remove'])(
    'keeps ticket and comanda coherent when %s overlaps close',
    async (action) => {
      const current = await order();
      const assertOverlap = overlap('tableOrder', 'findUnique');
      const edit =
        action === 'update'
          ? request(
              `table-orders/${current.id}/items/${current.saleTicket.items[0].id}`,
              { quantity: 1, expectedVersion: current.version },
              'PATCH',
            )
          : request(
              `table-orders/${current.id}/items/${current.saleTicket.items[0].id}?expectedVersion=${current.version}`,
              undefined,
              'DELETE',
            );
      const results = await Promise.allSettled([
        edit,
        request(`table-orders/${current.id}/close`, {
          paymentMethod: 'CASH',
          expectedVersion: current.version,
        }),
      ]);
      assertOverlap();
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const saved = await orders.findOne(current.id);
      if (saved.status === 'CLOSED') {
        expect(saved.saleTicket.status).toBe('CONFIRMED');
        expect(await stock()).toBe('3');
        expect(saved.saleTicket.total).toBe('20');
      } else {
        expect(saved.status).toBe('OPEN');
        expect(saved.saleTicket.status).toBe('DRAFT');
        expect(await stock()).toBe('5');
      }
    },
  );

  it('does not duplicate stock exit when closing twice', async () => {
    const current = await order();
    const assertOverlap = overlap('tableOrder', 'findUnique');
    const results = await Promise.allSettled([
      request(`table-orders/${current.id}/close`, { paymentMethod: 'CASH' }),
      request(`table-orders/${current.id}/close`, { paymentMethod: 'CASH' }),
    ]);
    assertOverlap();
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stock()).toBe('3');
    expect(
      await prisma.inventoryMovement.count({
        where: { productId, movementType: 'SALE_OUT' },
      }),
    ).toBe(1);
  });

  it('does not duplicate reversal when voiding twice', async () => {
    const draft = await ticket();
    await sales.confirm(draft.id, { paymentMethod: 'CASH' }, userId);
    const assertOverlap = overlap('saleTicket', 'findUnique');
    const results = await Promise.allSettled([
      request(`sales/tickets/${draft.id}/void`, { reason: 'test' }),
      request(`sales/tickets/${draft.id}/void`, { reason: 'test' }),
    ]);
    assertOverlap();
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stock()).toBe('5');
    expect(
      await prisma.inventoryMovement.count({
        where: { productId, movementType: 'VOID_REVERSAL' },
      }),
    ).toBe(1);
  });

  it('never goes negative when two sales compete for insufficient stock', async () => {
    const a = await ticket(4);
    const b = await ticket(4);
    const assertOverlap = overlap('productStock', 'findUnique');
    const results = await Promise.allSettled([
      request(`sales/tickets/${a.id}/confirm`, { paymentMethod: 'CASH' }),
      request(`sales/tickets/${b.id}/confirm`, { paymentMethod: 'CASH' }),
    ]);
    assertOverlap();
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stock()).toBe('1');
  });

  it('rolls back close including ticket, order, movements, audit and events on an intermediate fault', async () => {
    const current = await order();
    const before = await counts();
    const events = await prisma.operationEvent.count();
    instrument(async (model, method) => {
      if (model === 'tableOrder' && method === 'update')
        throw new Error('close fault');
    });
    await expect(
      orders.close(current.id, { paymentMethod: 'CASH' }, userId),
    ).rejects.toThrow('close fault');
    expect(await orders.findOne(current.id)).toEqual(current);
    expect(await stock()).toBe('5');
    expect(await counts()).toEqual(before);
    expect(await prisma.operationEvent.count()).toBe(events);
  });

  it('recovers a committed response and conflicts on a different payload', async () => {
    const draft = await ticket();
    const response = await confirm(draft.id);
    const before = await counts();
    expect(await confirm(draft.id)).toEqual(
      JSON.parse(JSON.stringify(response)),
    );
    await expect(
      confirm(draft.id, runId, {
        paymentMethod: 'CASH',
        ...{ expectedVersion: '999' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await counts()).toEqual(before);
  });

  it('concurrent identical keys confirm once and recover the same result', async () => {
    const draft = await ticket();
    const assertOverlap = overlap('idempotencyRecord', 'findUnique');
    const results = await Promise.allSettled([
      request(
        `sales/tickets/${draft.id}/confirm`,
        { paymentMethod: 'CASH' },
        'POST',
        runId,
      ),
      request(
        `sales/tickets/${draft.id}/confirm`,
        { paymentMethod: 'CASH' },
        'POST',
        runId,
      ),
    ]);
    assertOverlap();
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    expect((results[0] as PromiseFulfilledResult<unknown>).value).toEqual(
      (results[1] as PromiseFulfilledResult<unknown>).value,
    );
    expect(await stock()).toBe('3');
    expect(
      await prisma.inventoryMovement.count({
        where: { productId, movementType: 'SALE_OUT' },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { userId, action: 'SALE_TICKET_CONFIRMED' },
      }),
    ).toBe(1);
  });

  it('keeps a linked comanda version coherent when its ticket is edited directly', async () => {
    const current = await order();
    await request(
      `sales/tickets/${current.saleTicketId}/items/${current.saleTicket.items[0].id}`,
      { quantity: 1, expectedVersion: current.saleTicket.version },
      'PATCH',
    );
    const saved = await orders.findOne(current.id);
    expect(saved.version).toBe((BigInt(current.version) + 1n).toString());
    expect(saved.saleTicket.total).toBe('10');
  });

  it('closes a linked comanda atomically when confirming its ticket directly', async () => {
    const current = await order();
    await request(`sales/tickets/${current.saleTicketId}/confirm`, {
      paymentMethod: 'CASH',
    });
    const saved = await orders.findOne(current.id);
    expect(saved.status).toBe('CLOSED');
    expect(saved.saleTicket.status).toBe('CONFIRMED');
    expect(saved.version).toBe((BigInt(current.version) + 1n).toString());
  });

  it('cancels a linked comanda atomically when cancelling its ticket directly', async () => {
    const current = await order();
    await request(`sales/tickets/${current.saleTicketId}/cancel`, {
      reason: 'test',
    });
    const saved = await orders.findOne(current.id);
    expect(saved.status).toBe('CANCELLED');
    expect(saved.saleTicket.status).toBe('CANCELLED');
  });

  it('accepts DELETE expectedVersion as a string query and rejects stale or numeric DTO versions', async () => {
    const current = await order();
    const path = `table-orders/${current.id}/items/${current.saleTicket.items[0].id}`;
    await expect(
      request(`${path}?expectedVersion=0`, undefined, 'DELETE'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      request(
        path,
        { quantity: 1, expectedVersion: Number(current.version) },
        'PATCH',
      ),
    ).rejects.toThrow('HTTP 400');
    await request(
      `${path}?expectedVersion=${current.version}`,
      undefined,
      'DELETE',
    );
    expect((await orders.findOne(current.id)).version).toBe(
      (BigInt(current.version) + 1n).toString(),
    );
  });

  it('retains expired completed keys and blocks legacy incomplete keys until reconciliation', async () => {
    const operation = 'legacy-fixture';
    const keyHash = createHash('sha256')
      .update(`${userId}:${operation}:${runId}`)
      .digest('hex');
    recordHashes.push(keyHash);
    await prisma.idempotencyRecord.create({
      data: {
        keyHash,
        requestHash: createHash('sha256').update('{}').digest('hex'),
        expiresAt: new Date(0),
      },
    });
    const run = jest.fn().mockResolvedValue({ id: 'must-not-execute' });
    await expect(
      idem.execute({ key: runId, userId, operation, body: {}, run }),
    ).rejects.toMatchObject({
      response: { code: 'IDEMPOTENCY_RECOVERY_REQUIRED' },
    });
    expect(run).not.toHaveBeenCalled();
    await prisma.idempotencyRecord.update({
      where: { keyHash },
      data: { expiresAt: new Date(Date.now() + 60000) },
    });
    await expect(
      idem.execute({ key: runId, userId, operation, body: {}, run }),
    ).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_IN_PROGRESS' } });
    await prisma.idempotencyRecord.update({
      where: { keyHash },
      data: { response: { id: 'reconciled-result' }, expiresAt: new Date(0) },
    });
    await expect(
      idem.execute({ key: runId, userId, operation, body: {}, run }),
    ).resolves.toEqual({ id: 'reconciled-result' });
    expect(run).not.toHaveBeenCalled();
  });

  it('conflicts on concurrent different payloads using one idempotency key', async () => {
    const draft = await ticket();
    const assertOverlap = overlap('idempotencyRecord', 'findUnique');
    const results = await Promise.allSettled([
      request(
        `sales/tickets/${draft.id}/confirm`,
        { paymentMethod: 'CASH' },
        'POST',
        runId,
      ),
      request(
        `sales/tickets/${draft.id}/confirm`,
        { paymentMethod: 'CASH', expectedVersion: draft.version },
        'POST',
        runId,
      ),
    ]);
    assertOverlap();
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(failed.reason.response.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await stock()).toBe('3');
  });

  it('does not expose effects while the idempotent response is still uncommitted', async () => {
    const draft = await ticket();
    let arrived!: () => void;
    let release!: () => void;
    const reached = new Promise<void>((resolve) => {
      arrived = resolve;
    });
    const resume = new Promise<void>((resolve) => {
      release = resolve;
    });
    instrument(async (model, method) => {
      if (model === 'idempotencyRecord' && method === 'update') {
        arrived();
        await resume;
      }
    });
    const running = confirm(draft.id);
    await reached;
    try {
      expect(await stock()).toBe('5');
      expect((await sales.findOne(draft.id)).status).toBe('DRAFT');
    } finally {
      release();
    }
    await running;
    expect(await stock()).toBe('3');
  });

  it('supports bearer and cookie, revokes session tokens on logout, and preserves legacy bearer semantics', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash('Foundation-test-123', 4) },
    });
    const appConfig = app.get(ConfigService);
    appConfig.set('AUTH_COOKIE', true);
    try {
      const login = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `${runId}@example.com`,
          password: 'Foundation-test-123',
        }),
      });
      expect(login.status).toBe(200);
      const cookie = login.headers.get('set-cookie')!.split(';')[0];
      expect(login.headers.get('set-cookie')).toContain('HttpOnly');
      const body = await login.json();
      const me = (headers: Record<string, string>) =>
        fetch(`${baseUrl}/api/auth/me`, { headers });
      expect((await me({ Cookie: cookie })).status).toBe(200);
      expect(
        (await me({ Authorization: `Bearer ${body.accessToken}` })).status,
      ).toBe(200);
      const logout = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: cookie },
      });
      expect(logout.status).toBe(204);
      expect((await me({ Cookie: cookie })).status).toBe(401);
      expect(
        (await me({ Authorization: `Bearer ${body.accessToken}` })).status,
      ).toBe(401);
      expect(
        (
          await fetch(`${baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
        ).status,
      ).toBe(204);
      expect((await me({ Authorization: `Bearer ${token}` })).status).toBe(200);
    } finally {
      appConfig.set('AUTH_COOKIE', false);
    }
  });

  it('requires string versions and idempotency keys only when optimistic versioning is enabled', async () => {
    const current = await order();
    const appConfig = app.get(ConfigService);
    appConfig.set('OPTIMISTIC_VERSIONING', true);
    try {
      await expect(
        request(
          `table-orders/${current.id}/items/${current.saleTicket.items[0].id}`,
          undefined,
          'DELETE',
        ),
      ).rejects.toThrow('expectedVersion is required');
      await expect(
        request(`table-orders/${current.id}/close`, {
          paymentMethod: 'CASH',
          expectedVersion: current.version,
        }),
      ).rejects.toThrow('Idempotency-Key is required');
      const result = await request(
        `table-orders/${current.id}/close`,
        { paymentMethod: 'CASH', expectedVersion: current.version },
        'POST',
        runId,
      );
      expect(result.status).toBe('CLOSED');
    } finally {
      appConfig.set('OPTIMISTIC_VERSIONING', false);
    }
  });
});
