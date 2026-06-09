import { CommissionType, PrismaClient, Role } from '@prisma/client';
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

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main(): Promise<void> {
  const adminEmail = getRequiredEnv('ADMIN_EMAIL');
  const adminPassword = getRequiredEnv('ADMIN_PASSWORD');
  const adminFirstName = getRequiredEnv('ADMIN_FIRST_NAME');
  const adminLastName = getRequiredEnv('ADMIN_LAST_NAME');

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, role: true },
  });

  let adminUserId = existingUser?.id;

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const createdAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: Role.ADMIN,
        active: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    adminUserId = createdAdmin.id;
    console.log(
      `Seed completed: initial ADMIN user created for ${createdAdmin.email}.`,
    );
    console.warn(
      'Security warning: change the seeded admin credentials before using this application outside local development.',
    );
  } else {
    console.log(
      `Seed skipped: user ${existingUser.email} already exists with role ${existingUser.role}.`,
    );
  }

  let createdCategories = 0;
  let skippedCategories = 0;

  for (const name of initialCategories) {
    const existingCategory = await prisma.category.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existingCategory) {
      skippedCategories += 1;
      continue;
    }

    await prisma.category.create({
      data: {
        name,
        active: true,
        createdById: adminUserId ?? null,
      },
    });

    createdCategories += 1;
  }

  let createdSalesChannels = 0;
  let skippedSalesChannels = 0;

  for (const salesChannel of initialSalesChannels) {
    const existingSalesChannel = await prisma.salesChannel.findFirst({
      where: {
        OR: [{ name: salesChannel.name }, { code: salesChannel.code }],
      },
      select: { id: true },
    });

    if (existingSalesChannel) {
      skippedSalesChannels += 1;
      continue;
    }

    await prisma.salesChannel.create({
      data: {
        name: salesChannel.name,
        code: salesChannel.code,
        commissionType: salesChannel.commissionType,
        commissionValue: salesChannel.commissionValue,
        active: true,
        createdById: adminUserId ?? null,
      },
    });

    createdSalesChannels += 1;
  }

  console.log(
    `Seed categories: created ${createdCategories}, skipped ${skippedCategories}.`,
  );
  console.log(
    `Seed sales channels: created ${createdSalesChannels}, skipped ${skippedSalesChannels}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
