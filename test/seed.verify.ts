import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { SalesService } from '../src/sales/sales.service';

const prisma = new PrismaClient();
describe('Independent fictitious seed verification', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });
  function seed() {
    const result = spawnSync(
      process.execPath,
      ['-r', 'ts-node/register', 'prisma/seed.ts'],
      { env: process.env, encoding: 'utf8', timeout: 60000 },
    );
    if (result.status !== 0)
      throw new Error(`Seed failed: ${result.error?.message ?? result.stderr}`);
  }
  async function snapshot() {
    return {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      channels: await prisma.salesChannel.count(),
      banks: await prisma.paymentBank.count(),
      tables: await prisma.restaurantTable.count(),
      products: await prisma.product.count(),
      costs: await prisma.productCostHistory.count(),
      prices: await prisma.productPriceHistory.count(),
      movements: await prisma.inventoryMovement.count(),
      tickets: await prisma.saleTicket.count(),
      items: await prisma.saleTicketItem.count(),
      audits: await prisma.auditLog.count(),
      stock: (
        await prisma.productStock.findMany({ orderBy: { productId: 'asc' } })
      ).map((s) => ({
        id: s.id,
        productId: s.productId,
        quantity: s.currentStock.toString(),
      })),
      currentCosts: (
        await prisma.productCostHistory.findMany({ orderBy: { id: 'asc' } })
      ).map((c) => ({
        id: c.id,
        productId: c.productId,
        cost: c.cost.toString(),
        validTo: c.validTo,
      })),
      currentPrices: (
        await prisma.productPriceHistory.findMany({ orderBy: { id: 'asc' } })
      ).map((p) => ({
        id: p.id,
        productId: p.productId,
        channelId: p.salesChannelId,
        price: p.price.toString(),
        validTo: p.validTo,
      })),
    };
  }

  it('seeds an empty migrated database twice without duplicates, inflation or broken references, and preserves sold stock on the third run', async () => {
    expect(new URL(process.env.DATABASE_URL!).pathname).toMatch(
      /^\/foundation_seed(?:_\w+)?$/,
    );
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.saleTicket.count()).toBe(0);
    seed();
    const first = await snapshot();
    expect(first.products).toBe(4);
    expect(first.costs).toBe(4);
    expect(first.prices).toBe(20);
    expect(first.movements).toBe(3);
    seed();
    expect(await snapshot()).toEqual(first);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: process.env.ADMIN_EMAIL! },
    });
    const channel = await prisma.salesChannel.findUniqueOrThrow({
      where: { code: 'COUNTER' },
    });
    const product = await prisma.product.findUniqueOrThrow({
      where: { sku: 'MVP-COKE-500' },
    });
    const servicePrisma = prisma as unknown as PrismaService;
    const audit = new AuditService(servicePrisma);
    const sales = new SalesService(
      servicePrisma,
      new InventoryService(servicePrisma, audit),
      audit,
    );
    const draft = await sales.create({ salesChannelId: channel.id }, user.id);
    await sales.addItem(
      draft.id,
      { productId: product.id, quantity: 2 },
      user.id,
    );
    await sales.confirm(draft.id, { paymentMethod: 'CASH' }, user.id);
    const afterSale = await snapshot();
    expect(
      afterSale.stock.find((s) => s.productId === product.id)?.quantity,
    ).toBe('18');
    seed();
    expect(await snapshot()).toEqual(afterSale);
    const orphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM "SaleTicketItem" i
      LEFT JOIN "SaleTicket" t ON t.id = i."ticketId"
      LEFT JOIN "Product" p ON p.id = i."productId"
      WHERE t.id IS NULL OR p.id IS NULL`;
    expect(orphans[0].count.toString()).toBe('0');
    const invalid = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND NOT convalidated`;
    expect(invalid[0].count.toString()).toBe('0');
    expect(
      await prisma.productStock.count({ where: { currentStock: { lt: 0 } } }),
    ).toBe(0);
    console.log(
      'Seed evidence',
      JSON.stringify({
        first,
        afterSale,
        orphanItems: '0',
        unvalidatedForeignKeys: '0',
      }),
    );
  }, 90000);
});
