import { AppService } from '../src/app.service';

describe('AppService', () => {
  it('returns public API metadata', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test'),
    };
    const service = new AppService(configService as never);

    expect(service.getApiMetadata()).toEqual({
      service: 'restaurant-admin-api',
      version: '0.1.0',
      status: 'ok',
      docs: '/docs',
      health: '/health',
      environment: 'test',
    });
  });
});
