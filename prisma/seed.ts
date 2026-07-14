import {
  CommissionType,
  InventoryReferenceType,
  InventoryMovementType,
  Prisma,
  PrismaClient,
  ProductUnit,
  Role,
  StockManagementType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const initialCategories = [
  'Hamburguesas',
  'Papas',
  'Bebidas',
  'Postres',
  'Promociones',
] as const;

const initialSalesChannels = [
  {
    name: 'Mostrador',
    code: 'COUNTER',
    commissionType: CommissionType.NONE,
    commissionValue: 0,
  },
  {
    name: 'PedidosYa',
    code: 'PEDIDOS_YA',
    commissionType: CommissionType.PERCENTAGE,
    commissionValue: 0,
  },
  {
    name: 'Uber Eats',
    code: 'UBER_EATS',
    commissionType: CommissionType.PERCENTAGE,
    commissionValue: 0,
  },
  {
    name: 'WhatsApp',
    code: 'WHATSAPP',
    commissionType: CommissionType.NONE,
    commissionValue: 0,
  },
  {
    name: 'Salon',
    code: 'DINING_ROOM',
    commissionType: CommissionType.NONE,
    commissionValue: 0,
  },
] as const;

const initialPaymentBanks = [
  'Banco Galicia',
  'Banco Nacion',
  'Banco Provincia',
] as const;

const initialRestaurantTables = [
  { code: 'M01', name: 'Mesa 1', area: 'Salon', capacity: 4 },
  { code: 'M02', name: 'Mesa 2', area: 'Salon', capacity: 4 },
  { code: 'M03', name: 'Mesa 3', area: 'Salon', capacity: 2 },
  { code: 'Barra 01', name: 'Barra 01', area: 'Barra', capacity: 2 },
  { code: 'Terraza 01', name: 'Terraza 01', area: 'Terraza', capacity: 4 },
] as const;

const demoUsers = [
  {
    role: Role.MANAGER,
    emailEnv: 'MANAGER_EMAIL',
    passwordEnv: 'MANAGER_PASSWORD',
    firstName: 'Demo',
    lastName: 'Manager',
  },
  {
    role: Role.CASHIER,
    emailEnv: 'CASHIER_EMAIL',
    passwordEnv: 'CASHIER_PASSWORD',
    firstName: 'Demo',
    lastName: 'Cashier',
  },
  {
    role: Role.AUDITOR,
    emailEnv: 'AUDITOR_EMAIL',
    passwordEnv: 'AUDITOR_PASSWORD',
    firstName: 'Demo',
    lastName: 'Auditor',
  },
] as const;

const demoProducts = [
  {
    name: 'Hamburguesa clasica',
    description: 'Hamburguesa clasica para demo MVP.',
    sku: 'MVP-BURGER-001',
    categoryName: 'Hamburguesas',
    unit: ProductUnit.UNIT,
    stockManagementType: StockManagementType.FINISHED_PRODUCT,
    cost: 3500,
    stock: 10,
    pricesByChannelCode: {
      COUNTER: 8000,
      DINING_ROOM: 8000,
      PEDIDOS_YA: 9200,
      UBER_EATS: 9400,
      WHATSAPP: 8200,
    },
  },
  {
    name: 'Papas fritas',
    description: 'Papas fritas de demo para acompanar la venta.',
    sku: 'MVP-FRIES-001',
    categoryName: 'Papas',
    unit: ProductUnit.SERVICE,
    stockManagementType: StockManagementType.FINISHED_PRODUCT,
    cost: 1200,
    stock: 10,
    pricesByChannelCode: {
      COUNTER: 3200,
      DINING_ROOM: 3200,
      PEDIDOS_YA: 3700,
      UBER_EATS: 3800,
      WHATSAPP: 3300,
    },
  },
  {
    name: 'Coca-Cola 500ml',
    description: 'Bebida embotellada para demo MVP.',
    sku: 'MVP-COKE-500',
    categoryName: 'Bebidas',
    unit: ProductUnit.UNIT,
    stockManagementType: StockManagementType.FINISHED_PRODUCT,
    cost: 900,
    stock: 20,
    pricesByChannelCode: {
      COUNTER: 2500,
      DINING_ROOM: 2500,
      PEDIDOS_YA: 2900,
      UBER_EATS: 3000,
      WHATSAPP: 2600,
    },
  },
  {
    name: 'Cargo de delivery',
    description: 'Cargo no inventariable para demo MVP.',
    sku: 'MVP-DELIVERY-001',
    categoryName: 'Promociones',
    unit: ProductUnit.UNIT,
    stockManagementType: StockManagementType.NON_STOCKED,
    cost: 0,
    stock: null,
    pricesByChannelCode: {
      COUNTER: 0,
      DINING_ROOM: 0,
      PEDIDOS_YA: 1200,
      UBER_EATS: 1200,
      WHATSAPP: 800,
    },
  },
] as const;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}

async function ensureUser(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
}): Promise<{ id: string; email: string; role: Role }> {
  const existingUser = await prisma.user.findUnique({
    where: { email: params.email },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      active: true,
      passwordHash: true,
    },
  });

  const passwordHash = await bcrypt.hash(params.password, 10);

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
        role: params.role,
        active: true,
      },
    });

    console.log(
      `Seed user synchronized: ${existingUser.email} with role ${params.role}.`,
    );
    return {
      id: existingUser.id,
      email: existingUser.email,
      role: params.role,
    };
  }

  const createdUser = await prisma.user.create({
    data: {
      email: params.email,
      passwordHash,
      firstName: params.firstName,
      lastName: params.lastName,
      role: params.role,
      active: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  console.log(
    `Seed user created: ${createdUser.email} with role ${createdUser.role}.`,
  );

  return createdUser;
}

async function ensureCategories(
  createdById: string | null,
): Promise<Map<string, string>> {
  let createdCategories = 0;
  let skippedCategories = 0;
  const categoriesByName = new Map<string, string>();

  for (const name of initialCategories) {
    const existingCategory = await prisma.category.findUnique({
      where: { name },
      select: { id: true, name: true },
    });

    if (existingCategory) {
      skippedCategories += 1;
      categoriesByName.set(existingCategory.name, existingCategory.id);
      continue;
    }

    const createdCategory = await prisma.category.create({
      data: {
        name,
        active: true,
        createdById,
      },
      select: { id: true, name: true },
    });

    createdCategories += 1;
    categoriesByName.set(createdCategory.name, createdCategory.id);
  }

  console.log(
    `Seed categories: created ${createdCategories}, skipped ${skippedCategories}.`,
  );

  return categoriesByName;
}

async function ensureSalesChannels(
  createdById: string | null,
): Promise<Map<string, string>> {
  let createdSalesChannels = 0;
  let skippedSalesChannels = 0;
  const channelsByCode = new Map<string, string>();

  for (const salesChannel of initialSalesChannels) {
    const existingSalesChannel = await prisma.salesChannel.findFirst({
      where: {
        OR: [{ name: salesChannel.name }, { code: salesChannel.code }],
      },
      select: { id: true, code: true },
    });

    if (existingSalesChannel) {
      skippedSalesChannels += 1;
      channelsByCode.set(existingSalesChannel.code, existingSalesChannel.id);
      continue;
    }

    const createdSalesChannel = await prisma.salesChannel.create({
      data: {
        name: salesChannel.name,
        code: salesChannel.code,
        commissionType: salesChannel.commissionType,
        commissionValue: new Prisma.Decimal(salesChannel.commissionValue),
        active: true,
        createdById,
      },
      select: { id: true, code: true },
    });

    createdSalesChannels += 1;
    channelsByCode.set(createdSalesChannel.code, createdSalesChannel.id);
  }

  console.log(
    `Seed sales channels: created ${createdSalesChannels}, skipped ${skippedSalesChannels}.`,
  );

  return channelsByCode;
}

async function ensurePaymentBanks(createdById: string | null): Promise<void> {
  let createdPaymentBanks = 0;
  let skippedPaymentBanks = 0;

  for (const name of initialPaymentBanks) {
    const existingPaymentBank = await prisma.paymentBank.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existingPaymentBank) {
      skippedPaymentBanks += 1;
      continue;
    }

    await prisma.paymentBank.create({
      data: {
        name,
        active: true,
        createdById,
      },
      select: { id: true },
    });

    createdPaymentBanks += 1;
  }

  console.log(
    `Seed payment banks: created ${createdPaymentBanks}, skipped ${skippedPaymentBanks}.`,
  );
}

async function ensureRestaurantTables(createdById: string | null): Promise<void> {
  let createdTables = 0;
  let skippedTables = 0;

  for (const table of initialRestaurantTables) {
    const existingTable = await prisma.restaurantTable.findUnique({
      where: { code: table.code },
      select: { id: true },
    });

    if (existingTable) {
      skippedTables += 1;
      continue;
    }

    await prisma.restaurantTable.create({
      data: {
        code: table.code,
        name: table.name,
        area: table.area,
        capacity: table.capacity,
        active: true,
        createdById,
      },
      select: { id: true },
    });

    createdTables += 1;
  }

  console.log(
    `Seed restaurant tables: created ${createdTables}, skipped ${skippedTables}.`,
  );
}

async function ensureDemoProduct(params: {
  name: string;
  description: string;
  sku: string;
  categoryId: string | null;
  unit: ProductUnit;
  stockManagementType: StockManagementType;
  createdById: string | null;
}): Promise<{ id: string; name: string }> {
  const existingProduct = await prisma.product.findFirst({
    where: {
      OR: [{ sku: params.sku }, { name: params.name }],
    },
    select: { id: true, name: true },
  });

  if (existingProduct) {
    console.log(`Seed product skipped: ${existingProduct.name} already exists.`);
    return existingProduct;
  }

  const createdProduct = await prisma.product.create({
    data: {
      name: params.name,
      description: params.description,
      sku: params.sku,
      categoryId: params.categoryId,
      unit: params.unit,
      stockManagementType: params.stockManagementType,
      active: true,
      createdById: params.createdById,
    },
    select: { id: true, name: true },
  });

  console.log(`Seed product created: ${createdProduct.name}.`);

  return createdProduct;
}

async function ensureCurrentCost(params: {
  productId: string;
  productName: string;
  cost: number;
  createdById: string | null;
}): Promise<void> {
  const existingCurrentCost = await prisma.productCostHistory.findFirst({
    where: {
      productId: params.productId,
      validTo: null,
    },
    select: { id: true },
  });

  if (existingCurrentCost) {
    console.log(`Seed cost skipped: ${params.productName} already has current cost.`);
    return;
  }

  await prisma.productCostHistory.create({
    data: {
      productId: params.productId,
      cost: new Prisma.Decimal(params.cost),
      validFrom: new Date(),
      createdById: params.createdById,
    },
  });

  console.log(`Seed cost created: ${params.productName}.`);
}

async function ensureCurrentPrice(params: {
  productId: string;
  productName: string;
  salesChannelId: string;
  salesChannelCode: string;
  price: number;
  createdById: string | null;
}): Promise<void> {
  const existingCurrentPrice = await prisma.productPriceHistory.findFirst({
    where: {
      productId: params.productId,
      salesChannelId: params.salesChannelId,
      validTo: null,
    },
    select: { id: true },
  });

  if (existingCurrentPrice) {
    console.log(
      `Seed price skipped: ${params.productName} already has current price for ${params.salesChannelCode}.`,
    );
    return;
  }

  await prisma.productPriceHistory.create({
    data: {
      productId: params.productId,
      salesChannelId: params.salesChannelId,
      price: new Prisma.Decimal(params.price),
      validFrom: new Date(),
      createdById: params.createdById,
    },
  });

  console.log(
    `Seed price created: ${params.productName} for ${params.salesChannelCode}.`,
  );
}

async function ensureInitialStock(params: {
  productId: string;
  productName: string;
  quantity: number;
  createdById: string | null;
}): Promise<void> {
  const existingStock = await prisma.productStock.findUnique({
    where: { productId: params.productId },
    select: { id: true },
  });

  if (existingStock) {
    console.log(`Seed stock skipped: ${params.productName} already has stock row.`);
    return;
  }

  const existingMovementCount = await prisma.inventoryMovement.count({
    where: { productId: params.productId },
  });

  if (existingMovementCount > 0) {
    console.log(
      `Seed stock skipped: ${params.productName} already has inventory movements.`,
    );
    return;
  }

  const quantity = new Prisma.Decimal(params.quantity);
  const zero = new Prisma.Decimal(0);

  await prisma.$transaction([
    prisma.productStock.create({
      data: {
        productId: params.productId,
        currentStock: quantity,
        minimumStock: zero,
      },
    }),
    prisma.inventoryMovement.create({
      data: {
        productId: params.productId,
        movementType: InventoryMovementType.STOCK_IN,
        quantity,
        previousStock: zero,
        newStock: quantity,
        reason: 'Seed inicial MVP',
        referenceType: InventoryReferenceType.SYSTEM,
        createdById: params.createdById,
      },
    }),
  ]);

  console.log(`Seed stock created: ${params.productName} => ${params.quantity}.`);
}

async function main(): Promise<void> {
  const adminEmail = getRequiredEnv('ADMIN_EMAIL');
  const adminPassword = getRequiredEnv('ADMIN_PASSWORD');
  const adminFirstName = getRequiredEnv('ADMIN_FIRST_NAME');
  const adminLastName = getRequiredEnv('ADMIN_LAST_NAME');

  const adminUser = await ensureUser({
    email: adminEmail,
    password: adminPassword,
    firstName: adminFirstName,
    lastName: adminLastName,
    role: Role.ADMIN,
  });

  console.warn(
    'Security warning: seeded credentials are for local/demo use only and must be replaced in real environments.',
  );

  for (const demoUser of demoUsers) {
    const email = getOptionalEnv(demoUser.emailEnv);
    const password = getOptionalEnv(demoUser.passwordEnv);

    if (!email && !password) {
      console.log(
        `Seed demo user skipped: ${demoUser.role} not configured in environment.`,
      );
      continue;
    }

    if (!email || !password) {
      console.warn(
        `Seed demo user skipped: ${demoUser.role} requires both ${demoUser.emailEnv} and ${demoUser.passwordEnv}.`,
      );
      continue;
    }

    await ensureUser({
      email,
      password,
      firstName: demoUser.firstName,
      lastName: demoUser.lastName,
      role: demoUser.role,
    });
  }

  const categoriesByName = await ensureCategories(adminUser.id);
  const channelsByCode = await ensureSalesChannels(adminUser.id);
  await ensurePaymentBanks(adminUser.id);
  await ensureRestaurantTables(adminUser.id);

  for (const demoProduct of demoProducts) {
    const categoryId = categoriesByName.get(demoProduct.categoryName) ?? null;
    const product = await ensureDemoProduct({
      name: demoProduct.name,
      description: demoProduct.description,
      sku: demoProduct.sku,
      categoryId,
      unit: demoProduct.unit,
      stockManagementType: demoProduct.stockManagementType,
      createdById: adminUser.id,
    });

    await ensureCurrentCost({
      productId: product.id,
      productName: product.name,
      cost: demoProduct.cost,
      createdById: adminUser.id,
    });

    for (const [salesChannelCode, price] of Object.entries(
      demoProduct.pricesByChannelCode,
    )) {
      const salesChannelId = channelsByCode.get(salesChannelCode);

      if (!salesChannelId) {
        console.warn(
          `Seed price skipped: channel ${salesChannelCode} not found for ${product.name}.`,
        );
        continue;
      }

      await ensureCurrentPrice({
        productId: product.id,
        productName: product.name,
        salesChannelId,
        salesChannelCode,
        price,
        createdById: adminUser.id,
      });
    }

    if (demoProduct.stock !== null) {
      await ensureInitialStock({
        productId: product.id,
        productName: product.name,
        quantity: demoProduct.stock,
        createdById: adminUser.id,
      });
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
