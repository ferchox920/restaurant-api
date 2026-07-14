import { ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: {
    $transaction: jest.Mock;
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };
  let auditService: {
    log: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new UsersService(
      prismaService as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
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
    prismaService.user.findUnique.mockResolvedValueOnce({
      id: 'existing-user',
    });

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
      new ConflictException(
        'The last active ADMIN user cannot be deactivated.',
      ),
    );
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('creates an audit log without passwordHash when creating a user', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-password');
    prismaService.user.findUnique.mockResolvedValueOnce(null);
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(prismaService),
    );
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

    await service.create(
      {
        email: 'admin@example.com',
        password: 'ChangeMe123!',
        firstName: 'System',
        lastName: 'Admin',
        role: Role.ADMIN,
      },
      'admin-actor',
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-actor',
        entityId: 'user-1',
        beforeData: null,
        afterData: expect.not.objectContaining({
          passwordHash: expect.anything(),
        }),
      }),
      prismaService,
    );
  });

  it('writes before and after snapshots when updating a user', async () => {
    prismaService.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'old@example.com',
        passwordHash: 'secret',
        firstName: 'Old',
        lastName: 'Name',
        role: Role.CASHIER,
        active: true,
        lastLoginAt: null,
        createdAt: new Date('2026-06-09T00:00:00.000Z'),
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
      })
      .mockResolvedValueOnce(null);
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(prismaService),
    );
    prismaService.user.update.mockResolvedValueOnce({
      id: 'user-1',
      email: 'new@example.com',
      passwordHash: 'secret',
      firstName: 'New',
      lastName: 'Name',
      role: Role.CASHIER,
      active: true,
      lastLoginAt: null,
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-10T00:00:00.000Z'),
    });

    await service.update(
      'user-1',
      { email: 'new@example.com', firstName: 'New' },
      'admin-actor',
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-actor',
        beforeData: expect.objectContaining({
          email: 'old@example.com',
        }),
        afterData: expect.objectContaining({
          email: 'new@example.com',
        }),
      }),
      prismaService,
    );
  });

  it('creates an audit log when deactivating a user', async () => {
    prismaService.user.findUnique
      .mockResolvedValueOnce({
        id: 'cashier-1',
        role: Role.CASHIER,
        active: true,
      })
      .mockResolvedValueOnce({
        id: 'cashier-1',
        email: 'cashier@example.com',
        passwordHash: 'secret',
        firstName: 'Cashier',
        lastName: 'User',
        role: Role.CASHIER,
        active: true,
        lastLoginAt: null,
        createdAt: new Date('2026-06-09T00:00:00.000Z'),
        updatedAt: new Date('2026-06-09T00:00:00.000Z'),
      });
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(prismaService),
    );
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
      updatedAt: new Date('2026-06-10T00:00:00.000Z'),
    });

    await service.deactivate('cashier-1', 'admin-actor');

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-actor',
        beforeData: expect.objectContaining({ active: true }),
        afterData: expect.objectContaining({ active: false }),
      }),
      prismaService,
    );
  });

  it('creates an audit log when reactivating a user', async () => {
    prismaService.user.findUnique.mockResolvedValueOnce({
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
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(prismaService),
    );
    prismaService.user.update.mockResolvedValueOnce({
      id: 'cashier-1',
      email: 'cashier@example.com',
      passwordHash: 'secret',
      firstName: 'Cashier',
      lastName: 'User',
      role: Role.CASHIER,
      active: true,
      lastLoginAt: null,
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-10T00:00:00.000Z'),
    });

    await service.reactivate('cashier-1', 'admin-actor');

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-actor',
        beforeData: expect.objectContaining({ active: false }),
        afterData: expect.objectContaining({ active: true }),
      }),
      prismaService,
    );
  });
});
