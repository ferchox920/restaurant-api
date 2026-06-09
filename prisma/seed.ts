import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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

  if (existingUser) {
    console.log(
      `Seed skipped: user ${existingUser.email} already exists with role ${existingUser.role}.`,
    );
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: Role.ADMIN,
      active: true,
    },
  });

  console.log(`Seed completed: initial ADMIN user created for ${adminEmail}.`);
  console.warn(
    'Security warning: change the seeded admin credentials before using this application outside local development.',
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
