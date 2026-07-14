import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  InventoryMovementType,
  Prisma,
  PrismaClient,
  ProductUnit,
  Role,
  StockManagementType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

type JsonObject = Record<string, unknown>;

type ApiResponse<TBody = JsonObject> = {
  status: number;
  body: TBody;
};

const prisma = new PrismaClient();

describe('Table orders backend acceptance e2e', () => {
  let app: INestApplication;
  let baseUrl: string;
  let moduleRef: TestingModule;
  const runId = `accept-${Date.now()}`;
  const password = 'Acceptance123!';
  const createdIds: {
    userIds: string[];
    categoryIds: string[];
    salesChannelIds: string[];
    productIds: string[];
    tableIds: string[];
    saleTicketIds: string[];
    tableOrderIds: string[];
  } = {
    userIds: [],
    categoryIds: [],
    salesChannelIds: [],
    productIds: [],
    tableIds: [],
    saleTicketIds: [],
    tableOrderIds: [],
  };

  let adminToken: string;
  let cashierToken: string;
  let auditorToken: string;
  let databaseReachable = false;
  let adminUserId: string;
  let categoryId: string;
  let salesChannelId: string;
  let productId: string;

  beforeAll(async () => {
    await ensureDatabaseReachable();
    databaseReachable = true;

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'health', method: RequestMethod.GET },
        { path: 'health/readiness', method: RequestMethod.GET },
      ],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 0 : address.port;
    baseUrl = `http://127.0.0.1:${port}`;

    await seedAcceptanceData();

    adminToken = await login(`admin-${runId}@example.com`);
    cashierToken = await login(`cashier-${runId}@example.com`);
    auditorToken = await login(`auditor-${runId}@example.com`);
  }, 60_000);

  afterAll(async () => {
    if (databaseReachable) {
      await cleanupAcceptanceData();
    }
    await app?.close();
    await moduleRef?.close();
    await prisma.$disconnect();
  }, 60_000);

  it('validates whether the complete table-order sales objective is reached', async () => {
    const failures: string[] = [];
    const tableCode = `${runId}-M01`;
    const quantityToSell = 2;

    const table = await api<JsonObject>('POST', '/api/tables', adminToken, {
      code: tableCode,
      name: 'Mesa acceptance',
      area: 'Salon',
      capacity: 4,
    });
    expectStatus(table, 201, failures, 'create active table');
    const tableId = String(table.body.id ?? '');
    createdIds.tableIds.push(tableId);

    const listedTables = await api<JsonObject[]>(
      'GET',
      '/api/tables',
      adminToken,
    );
    expectStatus(listedTables, 200, failures, 'list tables');
    if (
      !Array.isArray(listedTables.body) ||
      !listedTables.body.some(
        (item) => item.id === tableId && item.code === tableCode,
      )
    ) {
      failures.push('table list does not expose created table by id and code');
    }

    const tableDetail = await api<JsonObject>(
      'GET',
      `/api/tables/${tableId}`,
      adminToken,
    );
    expectStatus(tableDetail, 200, failures, 'get table detail');
    if (
      tableDetail.body.active !== true ||
      tableDetail.body.status !== 'AVAILABLE'
    ) {
      failures.push('new active table is not visible as AVAILABLE');
    }

    const openedOrder = await api<JsonObject>(
      'POST',
      `/api/tables/${tableId}/orders/open`,
      cashierToken,
      {
        salesChannelId,
        notes: 'Acceptance order',
      },
    );
    expectStatus(openedOrder, 201, failures, 'open table order');
    const orderId = String(openedOrder.body.id ?? '');
    const saleTicketId = String(openedOrder.body.saleTicketId ?? '');
    createdIds.tableOrderIds.push(orderId);
    createdIds.saleTicketIds.push(saleTicketId);

    if (
      openedOrder.body.status !== 'OPEN' ||
      openedOrder.body.restaurantTableId !== tableId ||
      !saleTicketId
    ) {
      failures.push(
        'opened order is not OPEN, linked to table and draft ticket',
      );
    }

    const duplicateOpen = await api<JsonObject>(
      'POST',
      `/api/tables/${tableId}/orders/open`,
      cashierToken,
      { salesChannelId },
    );
    expectStatus(duplicateOpen, 409, failures, 'reject double open order');

    const addedItem = await api<JsonObject>(
      'POST',
      `/api/table-orders/${orderId}/items`,
      cashierToken,
      {
        productId,
        quantity: quantityToSell,
      },
    );
    expectStatus(
      addedItem,
      201,
      failures,
      'add consumption through table order wrapped SaleTicket DRAFT',
    );
    const addedTicket = addedItem.body.saleTicket as JsonObject | undefined;
    const item = Array.isArray(addedTicket?.items)
      ? (addedTicket.items[0] as JsonObject | undefined)
      : undefined;
    if (
      !item ||
      item.productId !== productId ||
      item.quantity !== String(quantityToSell) ||
      item.unitPriceSnapshot !== '5000' ||
      item.unitCostSnapshot !== '2000'
    ) {
      failures.push(
        'backend did not add item with quantity and price/cost snapshots',
      );
    }
    if ('unitPrice' in (item ?? {}) || 'unitCost' in (item ?? {})) {
      failures.push(
        'item response exposes non-snapshot price/cost fields unexpectedly',
      );
    }

    await expectStock(
      productId,
      '10',
      failures,
      'stock changed after adding item',
    );

    const updatedItem = await api<JsonObject>(
      'PATCH',
      `/api/table-orders/${orderId}/items/${String(item?.id ?? '')}`,
      cashierToken,
      {
        quantity: quantityToSell,
      },
    );
    expectStatus(
      updatedItem,
      200,
      failures,
      'update consumption through table order wrapped SaleTicket DRAFT',
    );
    await expectStock(
      productId,
      '10',
      failures,
      'stock changed after updating item',
    );

    const closeOrder = await api<JsonObject>(
      'POST',
      `/api/table-orders/${orderId}/close`,
      cashierToken,
      { paymentMethod: 'CASH' },
    );
    expectStatus(closeOrder, 200, failures, 'close table order');

    if (closeOrder.status === 200) {
      if (closeOrder.body.status !== 'CLOSED') {
        failures.push('closed endpoint did not return order status CLOSED');
      }

      const ticket = await api<JsonObject>(
        'GET',
        `/api/sales/tickets/${saleTicketId}`,
        cashierToken,
      );
      expectStatus(ticket, 200, failures, 'get confirmed sale ticket');
      if (ticket.body.status !== 'CONFIRMED') {
        failures.push('closing table order did not confirm the SaleTicket');
      }

      const ticketItem = Array.isArray(ticket.body.items)
        ? (ticket.body.items[0] as JsonObject | undefined)
        : undefined;
      for (const snapshotField of [
        'productNameSnapshot',
        'productSkuSnapshot',
        'productUnitSnapshot',
        'unitPriceSnapshot',
        'unitCostSnapshot',
      ]) {
        if (!ticketItem?.[snapshotField]) {
          failures.push(`confirmed ticket is missing ${snapshotField}`);
        }
      }

      await expectStock(
        productId,
        '8',
        failures,
        'stock was not reduced on close',
      );
      await expectSaleOutMovement(
        saleTicketId,
        productId,
        failures,
        'SALE_OUT was not generated on close',
      );

      const reusableOrder = await api<JsonObject>(
        'POST',
        `/api/tables/${tableId}/orders/open`,
        cashierToken,
        { salesChannelId },
      );
      expectStatus(
        reusableOrder,
        201,
        failures,
        'open new order after previous close',
      );
      if (reusableOrder.body.id) {
        createdIds.tableOrderIds.push(String(reusableOrder.body.id));
      }
      if (reusableOrder.body.saleTicketId) {
        createdIds.saleTicketIds.push(String(reusableOrder.body.saleTicketId));
      }
    }

    if (failures.length > 0) {
      throw new Error(
        [
          'OBJETIVO BACKEND NO ALCANZADO',
          'El flujo completo de mesas no esta cerrado:',
          ...failures.map((failure) => `- ${failure}`),
        ].join('\n'),
      );
    }
  }, 60_000);

  it('rejects opening orders on inactive tables', async () => {
    const tableId = await createTableViaApi(`${runId}-inactive`);
    await api('PATCH', `/api/tables/${tableId}/deactivate`, adminToken);

    const response = await api(
      'POST',
      `/api/tables/${tableId}/orders/open`,
      cashierToken,
      { salesChannelId },
    );

    expect(response.status).toBe(409);
  });

  it('rejects double open orders on the same table', async () => {
    const tableId = await createTableViaApi(`${runId}-double`);
    const first = await api<JsonObject>(
      'POST',
      `/api/tables/${tableId}/orders/open`,
      cashierToken,
      { salesChannelId },
    );
    createdIds.tableOrderIds.push(String(first.body.id ?? ''));
    createdIds.saleTicketIds.push(String(first.body.saleTicketId ?? ''));

    const second = await api(
      'POST',
      `/api/tables/${tableId}/orders/open`,
      cashierToken,
      { salesChannelId },
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it('rejects closing an order without items', async () => {
    const tableId = await createTableViaApi(`${runId}-empty-close`);
    const order = await api<JsonObject>(
      'POST',
      `/api/tables/${tableId}/orders/open`,
      cashierToken,
      { salesChannelId },
    );
    createdIds.tableOrderIds.push(String(order.body.id ?? ''));
    createdIds.saleTicketIds.push(String(order.body.saleTicketId ?? ''));

    const response = await api(
      'POST',
      `/api/table-orders/${String(order.body.id ?? '')}/close`,
      cashierToken,
      { paymentMethod: 'CASH' },
    );

    expect(response.status).toBe(409);
  });

  it('rejects products without current price for the table sales channel', async () => {
    const noPriceProduct = await createProductWithCostOnly('no-price');
    const tableId = await createTableViaApi(`${runId}-no-price`);
    const order = await openOrder(tableId);

    const response = await api(
      'POST',
      `/api/table-orders/${order.id}/items`,
      cashierToken,
      {
        productId: noPriceProduct,
        quantity: 1,
      },
    );

    expect(response.status).toBe(404);
  });

  it('rejects products without current cost', async () => {
    const noCostProduct = await createProductWithoutCost('no-cost');
    await prisma.productPriceHistory.create({
      data: {
        productId: noCostProduct,
        salesChannelId,
        price: new Prisma.Decimal('5000'),
        validFrom: new Date(),
        createdById: adminUserId,
      },
    });
    const tableId = await createTableViaApi(`${runId}-no-cost`);
    const order = await openOrder(tableId);

    const response = await api(
      'POST',
      `/api/table-orders/${order.id}/items`,
      cashierToken,
      {
        productId: noCostProduct,
        quantity: 1,
      },
    );

    expect(response.status).toBe(404);
  });

  it('keeps stock and order state unchanged when closing with insufficient stock', async () => {
    const tableId = await createTableViaApi(`${runId}-insufficient`);
    const order = await openOrder(tableId);
    const stockBeforeClose = await getStock(productId);

    await api('POST', `/api/table-orders/${order.id}/items`, cashierToken, {
      productId,
      quantity: 20,
    });

    const response = await api(
      'POST',
      `/api/table-orders/${order.id}/close`,
      cashierToken,
      { paymentMethod: 'CASH' },
    );

    expect(response.status).toBe(409);
    await expectStock(
      productId,
      stockBeforeClose,
      [],
      'stock changed on failed close',
    );

    const currentOrder = await api<JsonObject>(
      'GET',
      `/api/table-orders/${order.id}`,
      cashierToken,
    );
    expect(currentOrder.body.status).toBe('OPEN');

    const ticket = await api<JsonObject>(
      'GET',
      `/api/sales/tickets/${order.saleTicketId}`,
      cashierToken,
    );
    expect(ticket.body.status).toBe('DRAFT');
  });

  it('cancels an open order without stock movement or confirmed ticket', async () => {
    const tableId = await createTableViaApi(`${runId}-cancel`);
    const order = await openOrder(tableId);
    const stockBeforeCancel = await getStock(productId);

    await api('POST', `/api/table-orders/${order.id}/items`, cashierToken, {
      productId,
      quantity: 2,
    });

    const response = await api<JsonObject>(
      'POST',
      `/api/table-orders/${order.id}/cancel`,
      cashierToken,
      {
        reason: 'Cliente se retiro',
      },
    );

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CANCELLED');
    await expectStock(
      productId,
      stockBeforeCancel,
      [],
      'stock changed on cancellation',
    );

    const ticket = await api<JsonObject>(
      'GET',
      `/api/sales/tickets/${order.saleTicketId}`,
      cashierToken,
    );
    expect(ticket.body.status).toBe('CANCELLED');

    const newOrder = await api<JsonObject>(
      'POST',
      `/api/tables/${tableId}/orders/open`,
      cashierToken,
      { salesChannelId },
    );
    expect(newOrder.status).toBe(201);
    createdIds.tableOrderIds.push(String(newOrder.body.id ?? ''));
    createdIds.saleTicketIds.push(String(newOrder.body.saleTicketId ?? ''));
  });

  it('enforces authentication and role permissions', async () => {
    const tableId = await createTableViaApi(`${runId}-permissions`);

    const noToken = await api('GET', '/api/table-orders');
    expect(noToken.status).toBe(401);

    const auditorOpen = await api(
      'POST',
      `/api/tables/${tableId}/orders/open`,
      auditorToken,
      { salesChannelId },
    );
    expect(auditorOpen.status).toBe(403);

    const cashierCreateTable = await api('POST', '/api/tables', cashierToken, {
      code: `${runId}-cashier-admin`,
    });
    expect(cashierCreateTable.status).toBe(403);

    const auditorList = await api('GET', '/api/table-orders', auditorToken);
    expect(auditorList.status).toBe(200);
  });

  async function seedAcceptanceData(): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 10);
    const [admin, cashier, auditor] = await Promise.all([
      prisma.user.create({
        data: {
          email: `admin-${runId}@example.com`,
          passwordHash,
          firstName: 'Acceptance',
          lastName: 'Admin',
          role: Role.ADMIN,
          active: true,
        },
      }),
      prisma.user.create({
        data: {
          email: `cashier-${runId}@example.com`,
          passwordHash,
          firstName: 'Acceptance',
          lastName: 'Cashier',
          role: Role.CASHIER,
          active: true,
        },
      }),
      prisma.user.create({
        data: {
          email: `auditor-${runId}@example.com`,
          passwordHash,
          firstName: 'Acceptance',
          lastName: 'Auditor',
          role: Role.AUDITOR,
          active: true,
        },
      }),
    ]);
    adminUserId = admin.id;
    createdIds.userIds.push(admin.id, cashier.id, auditor.id);

    const category = await prisma.category.create({
      data: {
        name: `${runId}-category`,
        active: true,
        createdById: admin.id,
      },
    });
    categoryId = category.id;
    createdIds.categoryIds.push(category.id);

    const channel = await prisma.salesChannel.create({
      data: {
        name: `${runId}-Salon`,
        code: `${runId}-SALON`,
        active: true,
        createdById: admin.id,
      },
    });
    salesChannelId = channel.id;
    createdIds.salesChannelIds.push(channel.id);

    productId = await createFinishedProduct('burger');
    await prisma.productCostHistory.create({
      data: {
        productId,
        cost: new Prisma.Decimal('2000'),
        validFrom: new Date(),
        createdById: admin.id,
      },
    });
    await prisma.productPriceHistory.create({
      data: {
        productId,
        salesChannelId,
        price: new Prisma.Decimal('5000'),
        validFrom: new Date(),
        createdById: admin.id,
      },
    });
    await prisma.productStock.create({
      data: {
        productId,
        currentStock: new Prisma.Decimal('10'),
        minimumStock: new Prisma.Decimal('0'),
      },
    });
  }

  async function ensureDatabaseReachable(): Promise<void> {
    let timeout: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise(
          (_, reject) =>
            (timeout = setTimeout(
              () => reject(new Error('database connection timeout')),
              5000,
            )),
        ),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        [
          'OBJETIVO BACKEND NO ALCANZADO',
          'No se pudo ejecutar el test de aceptacion porque la base de datos de test no esta disponible.',
          `Detalle: ${message}`,
        ].join('\n'),
      );
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  async function login(email: string): Promise<string> {
    const response = await api<{ accessToken?: string }>(
      'POST',
      '/api/auth/login',
      undefined,
      {
        email,
        password,
      },
    );

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    return String(response.body.accessToken);
  }

  async function api<TBody = JsonObject>(
    method: string,
    path: string,
    token?: string,
    body?: unknown,
  ): Promise<ApiResponse<TBody>> {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    return {
      status: response.status,
      body: (text ? JSON.parse(text) : {}) as TBody,
    };
  }

  function expectStatus(
    response: ApiResponse<unknown>,
    expectedStatus: number,
    failures: string[],
    label: string,
  ): void {
    if (response.status !== expectedStatus) {
      failures.push(
        `${label}: expected ${expectedStatus}, got ${response.status} (${JSON.stringify(
          response.body,
        )})`,
      );
    }
  }

  async function expectStock(
    stockProductId: string,
    expectedStock: string,
    failures: string[],
    label: string,
  ): Promise<void> {
    const stock = await prisma.productStock.findUnique({
      where: { productId: stockProductId },
    });

    if (stock?.currentStock.toString() !== expectedStock) {
      const message = `${label}: expected stock ${expectedStock}, got ${
        stock?.currentStock.toString() ?? 'missing'
      }`;

      if (failures.length === 0) {
        expect(stock?.currentStock.toString()).toBe(expectedStock);
      } else {
        failures.push(message);
      }
    }
  }

  async function getStock(stockProductId: string): Promise<string> {
    const stock = await prisma.productStock.findUnique({
      where: { productId: stockProductId },
    });

    return stock?.currentStock.toString() ?? 'missing';
  }

  async function expectSaleOutMovement(
    saleTicketId: string,
    movementProductId: string,
    failures: string[],
    label: string,
  ): Promise<void> {
    const movement = await prisma.inventoryMovement.findFirst({
      where: {
        productId: movementProductId,
        referenceId: saleTicketId,
        movementType: InventoryMovementType.SALE_OUT,
      },
    });

    if (!movement) {
      failures.push(label);
    }
  }

  async function createTableViaApi(code: string): Promise<string> {
    const table = await api<JsonObject>('POST', '/api/tables', adminToken, {
      code,
      name: code,
      area: 'Acceptance',
      capacity: 4,
    });
    expect(table.status).toBe(201);
    const tableId = String(table.body.id);
    createdIds.tableIds.push(tableId);
    return tableId;
  }

  async function openOrder(
    tableId: string,
  ): Promise<{ id: string; saleTicketId: string }> {
    const order = await api<JsonObject>(
      'POST',
      `/api/tables/${tableId}/orders/open`,
      cashierToken,
      { salesChannelId },
    );
    expect(order.status).toBe(201);
    const opened = {
      id: String(order.body.id),
      saleTicketId: String(order.body.saleTicketId),
    };
    createdIds.tableOrderIds.push(opened.id);
    createdIds.saleTicketIds.push(opened.saleTicketId);
    return opened;
  }

  async function createFinishedProduct(suffix: string): Promise<string> {
    const product = await prisma.product.create({
      data: {
        name: `${runId}-${suffix}`,
        sku: `${runId}-${suffix}`,
        categoryId,
        unit: ProductUnit.UNIT,
        stockManagementType: StockManagementType.FINISHED_PRODUCT,
        active: true,
        createdById: adminUserId,
      },
    });
    createdIds.productIds.push(product.id);
    return product.id;
  }

  async function createProductWithCostOnly(suffix: string): Promise<string> {
    const id = await createFinishedProduct(suffix);
    await prisma.productCostHistory.create({
      data: {
        productId: id,
        cost: new Prisma.Decimal('2000'),
        validFrom: new Date(),
        createdById: adminUserId,
      },
    });
    return id;
  }

  async function createProductWithoutCost(suffix: string): Promise<string> {
    return createFinishedProduct(suffix);
  }

  async function cleanupAcceptanceData(): Promise<void> {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: createdIds.userIds } },
          { entityId: { in: createdIds.tableOrderIds } },
          { entityId: { in: createdIds.tableIds } },
          { entityId: { in: createdIds.saleTicketIds } },
        ],
      },
    });
    await prisma.inventoryMovement.deleteMany({
      where: {
        OR: [
          { productId: { in: createdIds.productIds } },
          { referenceId: { in: createdIds.saleTicketIds } },
        ],
      },
    });
    await prisma.tableOrder.deleteMany({
      where: { id: { in: createdIds.tableOrderIds.filter(Boolean) } },
    });
    await prisma.saleTicketItem.deleteMany({
      where: { ticketId: { in: createdIds.saleTicketIds.filter(Boolean) } },
    });
    await prisma.saleTicket.deleteMany({
      where: { id: { in: createdIds.saleTicketIds.filter(Boolean) } },
    });
    await prisma.productStock.deleteMany({
      where: { productId: { in: createdIds.productIds.filter(Boolean) } },
    });
    await prisma.productPriceHistory.deleteMany({
      where: { productId: { in: createdIds.productIds.filter(Boolean) } },
    });
    await prisma.productCostHistory.deleteMany({
      where: { productId: { in: createdIds.productIds.filter(Boolean) } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: createdIds.productIds.filter(Boolean) } },
    });
    await prisma.restaurantTable.deleteMany({
      where: { id: { in: createdIds.tableIds.filter(Boolean) } },
    });
    await prisma.salesChannel.deleteMany({
      where: { id: { in: createdIds.salesChannelIds.filter(Boolean) } },
    });
    await prisma.category.deleteMany({
      where: { id: { in: createdIds.categoryIds.filter(Boolean) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: createdIds.userIds.filter(Boolean) } },
    });
  }
});
