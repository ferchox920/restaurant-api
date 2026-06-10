import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { CommissionType } from './sales-channel.enums';
import { SalesChannelsService } from './sales-channels.service';

describe('SalesChannelsService', () => {
  let service: SalesChannelsService;
  let prismaService: {
    $transaction: jest.Mock;
    salesChannel: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditService: {
    log: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
      salesChannel: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new SalesChannelsService(
      prismaService as unknown as PrismaService,
      auditService as unknown as AuditService,
    );
  });

  it('creates a sales channel', async () => {
    prismaService.salesChannel.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaService.salesChannel.create.mockResolvedValueOnce({
      id: 'channel-1',
      name: 'Mostrador',
      code: 'COUNTER',
      description: null,
      commissionType: CommissionType.NONE,
      commissionValue: new Decimal(0),
      active: true,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.create(
      {
        name: 'Mostrador',
        code: 'COUNTER',
      },
      'manager-1',
    );

    expect(prismaService.salesChannel.create).toHaveBeenCalledWith({
      data: {
        name: 'Mostrador',
        code: 'COUNTER',
        description: null,
        commissionType: CommissionType.NONE,
        commissionValue: 0,
        createdById: 'manager-1',
      },
    });
    expect(result.commissionType).toBe(CommissionType.NONE);
    expect(result.commissionValue).toBe(0);
  });

  it('does not allow duplicate code', async () => {
    prismaService.salesChannel.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing-code' });

    await expect(
      service.create(
        {
          name: 'Mostrador',
          code: 'COUNTER',
        },
        'manager-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('does not allow duplicate name', async () => {
    prismaService.salesChannel.findUnique.mockResolvedValueOnce({
      id: 'existing-name',
    });

    await expect(
      service.create(
        {
          name: 'Mostrador',
          code: 'COUNTER',
        },
        'manager-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('accepts commissionType NONE with commissionValue 0', async () => {
    prismaService.salesChannel.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaService.salesChannel.create.mockResolvedValueOnce({
      id: 'channel-1',
      name: 'Salon',
      code: 'DINING_ROOM',
      description: null,
      commissionType: CommissionType.NONE,
      commissionValue: new Decimal(0),
      active: true,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.create(
      {
        name: 'Salon',
        code: 'DINING_ROOM',
        commissionType: CommissionType.NONE,
        commissionValue: 0,
      },
      'manager-1',
    );

    expect(result.commissionValue).toBe(0);
  });

  it('rejects percentage commission outside 0 to 100', async () => {
    prismaService.salesChannel.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          name: 'PedidosYa',
          code: 'PEDIDOS_YA',
          commissionType: CommissionType.PERCENTAGE,
          commissionValue: 120,
        },
        'manager-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('deactivates a sales channel', async () => {
    prismaService.salesChannel.update.mockResolvedValueOnce({
      id: 'channel-1',
      name: 'WhatsApp',
      code: 'WHATSAPP',
      description: null,
      commissionType: CommissionType.NONE,
      commissionValue: new Decimal(0),
      active: false,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.deactivate('channel-1');

    expect(prismaService.salesChannel.update).toHaveBeenCalledWith({
      where: { id: 'channel-1' },
      data: { active: false },
    });
    expect(result.active).toBe(false);
  });

  it('reactivates a sales channel', async () => {
    prismaService.salesChannel.update.mockResolvedValueOnce({
      id: 'channel-1',
      name: 'WhatsApp',
      code: 'WHATSAPP',
      description: null,
      commissionType: CommissionType.NONE,
      commissionValue: new Decimal(0),
      active: true,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    const result = await service.reactivate('channel-1');

    expect(prismaService.salesChannel.update).toHaveBeenCalledWith({
      where: { id: 'channel-1' },
      data: { active: true },
    });
    expect(result.active).toBe(true);
  });

  it('creates an audit log when creating a sales channel', async () => {
    prismaService.salesChannel.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaService.$transaction.mockImplementationOnce(async (callback) =>
      callback(prismaService),
    );
    prismaService.salesChannel.create.mockResolvedValueOnce({
      id: 'channel-1',
      name: 'Mostrador',
      code: 'COUNTER',
      description: null,
      commissionType: CommissionType.NONE,
      commissionValue: new Decimal(0),
      active: true,
      createdById: 'manager-1',
      createdAt: new Date('2026-06-09T00:00:00.000Z'),
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    });

    await service.create(
      {
        name: 'Mostrador',
        code: 'COUNTER',
      },
      'manager-1',
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'manager-1',
        entityId: 'channel-1',
        afterData: expect.objectContaining({
          code: 'COUNTER',
        }),
      }),
      prismaService,
    );
  });
});
