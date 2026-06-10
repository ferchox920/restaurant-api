import { NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: {
    auditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    service = new AuditService(prismaService as unknown as PrismaService);
  });

  it('sanitizes sensitive fields recursively before persisting a log', async () => {
    await service.log({
      userId: 'admin-1',
      action: AuditAction.USER_CREATED,
      entityType: AuditEntityType.USER,
      entityId: 'user-1',
      afterData: {
        email: 'admin@example.com',
        password: 'secret',
        nested: {
          passwordHash: 'hash',
          accessToken: 'token',
          safe: true,
        },
        items: [{ refreshToken: 'refresh', ok: 1 }],
      },
    });

    expect(prismaService.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        afterData: {
          email: 'admin@example.com',
          nested: { safe: true },
          items: [{ ok: 1 }],
        },
      }),
    });
  });

  it('uses the provided transaction client when available', async () => {
    const tx = {
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    } as unknown as Prisma.TransactionClient;

    await service.log(
      {
        action: AuditAction.CATEGORY_CREATED,
        entityType: AuditEntityType.CATEGORY,
      },
      tx,
    );

    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(prismaService.auditLog.create).not.toHaveBeenCalled();
  });

  it('lists logs with filters, pagination defaults and descending order', async () => {
    prismaService.auditLog.findMany.mockResolvedValueOnce([]);

    await service.findAll({
      userId: 'user-1',
      action: AuditAction.PRODUCT_CREATED,
      entityType: AuditEntityType.PRODUCT,
      entityId: 'product-1',
    });

    expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        action: AuditAction.PRODUCT_CREATED,
        entityType: AuditEntityType.PRODUCT,
        entityId: 'product-1',
        createdAt: undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      skip: 0,
    });
  });

  it('throws NotFound when the audit log does not exist', async () => {
    prismaService.auditLog.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing-log')).rejects.toThrow(
      NotFoundException,
    );
  });
});
