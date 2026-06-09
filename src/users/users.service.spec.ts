import { ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new UsersService(prismaService as unknown as PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a user with a hashed password', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-password');
    prismaService.user.findUnique.mockResolvedValueOnce(null);
    prismaService.user.create.mockResolvedValueOnce({
      id: 'user-1',
      email: 'admin@example.com',
      passwordHash: 'hashed-password',
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      active: true,
      lastLoginAt: null,
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.create({
      email: 'admin@example.com',
      password: 'ChangeMe123!',
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('ChangeMe123!', 10);
    expect(prismaService.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'admin@example.com',
        passwordHash: 'hashed-password',
      }),
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.email).toBe('admin@example.com');
  });

  it('does not allow duplicate email on create', async () => {
    prismaService.user.findUnique.mockResolvedValueOnce({ id: 'existing-user' });

    await expect(
      service.create({
        email: 'admin@example.com',
        password: 'ChangeMe123!',
        firstName: 'System',
        lastName: 'Admin',
        role: Role.ADMIN,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('lists users without passwordHash', async () => {
    prismaService.user.findMany.mockResolvedValueOnce([
      {
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: 'secret-1',
        firstName: 'System',
        lastName: 'Admin',
        role: Role.ADMIN,
        active: true,
        lastLoginAt: null,
        createdAt: new Date('2026-06-09T00:00:00.000Z'),
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
      },
      {
        id: 'cashier-1',
        email: 'cashier@example.com',
        passwordHash: 'secret-2',
        firstName: 'Cashier',
        lastName: 'User',
        role: Role.CASHIER,
        active: true,
        lastLoginAt: null,
        createdAt: new Date('2026-06-09T00:00:00.000Z'),
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
      },
    ]);

    const result = await service.findAll();

    expect(result).toHaveLength(2);
    expect(result[0]).not.toHaveProperty('passwordHash');
    expect(result[1]).not.toHaveProperty('passwordHash');
  });

  it('deactivates a user', async () => {
    prismaService.user.findUnique.mockResolvedValueOnce({
      id: 'cashier-1',
      role: Role.CASHIER,
      active: true,
    });
    prismaService.user.update.mockResolvedValueOnce({
      id: 'cashier-1',
      email: 'cashier@example.com',
      passwordHash: 'secret',
      firstName: 'Cashier',
      lastName: 'User',
      role: Role.CASHIER,
      active: false,
      lastLoginAt: null,
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.deactivate('cashier-1');

    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'cashier-1' },
      data: { active: false },
    });
    expect(result.active).toBe(false);
  });

  it('does not allow deactivating the last active admin', async () => {
    prismaService.user.findUnique.mockResolvedValueOnce({
      id: 'admin-1',
      role: Role.ADMIN,
      active: true,
    });
    prismaService.user.count.mockResolvedValueOnce(1);

    await expect(service.deactivate('admin-1')).rejects.toThrow(
      new ConflictException('The last active ADMIN user cannot be deactivated.'),
    );
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });
});
