import {
  PrismaClient,
  ProductUnit,
  Role,
  SaleTicketStatus,
  StockManagementType,
} from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service';
import { ReportsService } from '../src/reports/reports.service';

const prisma = new PrismaClient();

describe('Reports aggregation e2e', () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let userId: string;
  let salesChannelId: string;
  let productId: string;
  let ticketId: string;
  let service: ReportsService;

  beforeAll(async () => {
    await prisma.$connect();
    service = new ReportsService(prisma as unknown as PrismaService);

    const user = await prisma.user.create({
      data: {
        email: `reports-${runId}@example.com`,
        passwordHash: 'not-used-by-this-test',
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: Role.MANAGER,
      },
    });
    userId = user.id;

    const channel = await prisma.salesChannel.create({
      data: {
        name: `Reports channel ${runId}`,
        code: `REPORTS-${runId}`,
      },
    });
    salesChannelId = channel.id;

    const product = await prisma.product.create({
      data: {
        name: `Reports product ${runId}`,
        sku: `REPORTS-${runId}`,
        unit: ProductUnit.UNIT,
        stockManagementType: StockManagementType.NON_STOCKED,
      },
    });
    productId = product.id;

    const ticket = await prisma.saleTicket.create({
      data: {
        salesChannelId,
        status: SaleTicketStatus.CONFIRMED,
        subtotal: '30',
        total: '30',
        confirmedById: userId,
        confirmedAt: new Date('2026-07-13T12:00:00.000Z'),
        items: {
          create: [
            {
              productId,
              productNameSnapshot: 'Historical product name',
              productSkuSnapshot: 'HISTORICAL-SKU',
              productUnitSnapshot: ProductUnit.UNIT,
              quantity: '1',
              unitPriceSnapshot: '10',
              unitCostSnapshot: '4',
              subtotal: '10',
            },
            {
              productId,
              productNameSnapshot: 'Historical product name',
              productSkuSnapshot: 'HISTORICAL-SKU',
              productUnitSnapshot: ProductUnit.UNIT,
              quantity: '2',
              unitPriceSnapshot: '10',
              unitCostSnapshot: '4',
              subtotal: '20',
            },
          ],
        },
      },
    });
    ticketId = ticket.id;
  });

  afterAll(async () => {
    if (ticketId) {
      await prisma.saleTicket.delete({ where: { id: ticketId } });
    }
    if (productId) {
      await prisma.product.delete({ where: { id: productId } });
    }
    if (salesChannelId) {
      await prisma.salesChannel.delete({ where: { id: salesChannelId } });
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('aggregates confirmed sales in PostgreSQL without changing response shapes', async () => {
    const filters = {
      from: new Date('2026-07-13T00:00:00.000Z'),
      to: new Date('2026-07-13T23:59:59.999Z'),
    };

    await expect(
      service.getSalesByChannelReport({
        ...filters,
        salesChannelId,
      }),
    ).resolves.toEqual([
      {
        salesChannelId,
        salesChannelName: `Reports channel ${runId}`,
        salesChannelCode: `REPORTS-${runId}`,
        ticketsCount: 1,
        itemsCount: 2,
        quantitySold: '3',
        grossSales: '30',
        historicalCost: '12',
        grossProfit: '18',
        averageTicket: '30',
      },
    ]);

    await expect(
      service.getSalesByProductReport({ ...filters, productId }),
    ).resolves.toEqual([
      {
        productId,
        productNameSnapshot: 'Historical product name',
        productSkuSnapshot: 'HISTORICAL-SKU',
        productUnitSnapshot: ProductUnit.UNIT,
        quantitySold: '3',
        grossSales: '30',
        historicalCost: '12',
        grossProfit: '18',
        ticketsCount: 1,
      },
    ]);

    await expect(
      service.getSalesByUserReport({ ...filters, userId }),
    ).resolves.toEqual([
      {
        userId,
        userEmail: `reports-${runId}@example.com`,
        userFullName: 'Ada Lovelace',
        ticketsCount: 1,
        itemsCount: 2,
        quantitySold: '3',
        grossSales: '30',
        historicalCost: '12',
        grossProfit: '18',
      },
    ]);
  });
});
