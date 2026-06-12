import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('test'),
  };

  it('returns liveness payload', () => {
    const prismaService = {
      $queryRaw: jest.fn(),
    };
    const service = new HealthService(
      configService as never,
      prismaService as never,
    );

    expect(service.getHealth()).toEqual({
      status: 'ok',
      service: 'restaurant-admin-api',
      timestamp: expect.any(String),
      environment: 'test',
    });
  });

  it('returns readiness payload when database check succeeds', async () => {
    const prismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const service = new HealthService(
      configService as never,
      prismaService as never,
    );

    await expect(service.getReadiness()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
      timestamp: expect.any(String),
    });
    expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns a safe error when database check fails', async () => {
    const prismaService = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('db offline')),
    };
    const service = new HealthService(
      configService as never,
      prismaService as never,
    );

    await expect(service.getReadiness()).rejects.toMatchObject({
      response: {
        status: 'error',
        database: 'unavailable',
        timestamp: expect.any(String),
      },
      status: 503,
    });
  });
});
