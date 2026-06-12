import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: {
    getHealth: jest.Mock;
    getReadiness: jest.Mock;
  };

  beforeEach(async () => {
    healthService = {
      getHealth: jest.fn().mockReturnValue({
        status: 'ok',
        service: 'restaurant-admin-api',
        timestamp: '2026-06-10T00:00:00.000Z',
        environment: 'test',
      }),
      getReadiness: jest.fn().mockResolvedValue({
        status: 'ok',
        database: 'ok',
        timestamp: '2026-06-10T00:00:00.000Z',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('delegates liveness checks to the service', () => {
    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'restaurant-admin-api',
      timestamp: '2026-06-10T00:00:00.000Z',
      environment: 'test',
    });
    expect(healthService.getHealth).toHaveBeenCalledTimes(1);
  });

  it('delegates readiness checks to the service', async () => {
    await expect(controller.getReadiness()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
      timestamp: '2026-06-10T00:00:00.000Z',
    });
    expect(healthService.getReadiness).toHaveBeenCalledTimes(1);
  });
});
