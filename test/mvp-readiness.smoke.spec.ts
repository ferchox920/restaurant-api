import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';

describe('MVP readiness smoke tests', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [AppController, HealthController, AuthController],
      providers: [
        AppService,
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({
              accessToken: 'signed-jwt-token',
              user: {
                id: 'admin-1',
                email: 'admin@example.com',
                firstName: 'System',
                lastName: 'Admin',
                role: 'ADMIN',
                active: true,
                lastLoginAt: '2026-06-10T00:00:00.000Z',
                createdAt: '2026-06-10T00:00:00.000Z',
                updatedAt: '2026-06-10T00:00:00.000Z',
              },
            }),
          },
        },
        {
          provide: HealthService,
          useValue: {
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
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test'),
          },
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  async function createBaseUrl(): Promise<{
    baseUrl: string;
    close: () => Promise<void>;
  }> {
    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'health', method: RequestMethod.GET },
        { path: 'health/readiness', method: RequestMethod.GET },
      ],
    });

    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 0 : address.port;

    return {
      baseUrl: `http://127.0.0.1:${port}`,
      close: () => app.close(),
    };
  }

  it('serves public API metadata from GET /api', async () => {
    const server = await createBaseUrl();

    try {
      const response = await fetch(`${server.baseUrl}/api`);
      const body = (await response.json()) as Record<string, string>;

      expect(response.status).toBe(200);
      expect(body).toEqual({
        service: 'restaurant-admin-api',
        version: '0.1.0',
        status: 'ok',
        docs: '/docs',
        health: '/health',
        environment: 'test',
      });
    } finally {
      await server.close();
    }
  });

  it('serves liveness from GET /health without the global prefix', async () => {
    const server = await createBaseUrl();

    try {
      const response = await fetch(`${server.baseUrl}/health`);
      const body = (await response.json()) as Record<string, string>;

      expect(response.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.environment).toBe('test');
    } finally {
      await server.close();
    }
  });

  it('serves readiness from GET /health/readiness without the global prefix', async () => {
    const server = await createBaseUrl();

    try {
      const response = await fetch(`${server.baseUrl}/health/readiness`);
      const body = (await response.json()) as Record<string, string>;

      expect(response.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.database).toBe('ok');
    } finally {
      await server.close();
    }
  });

  it('serves login on POST /api/auth/login', async () => {
    const server = await createBaseUrl();

    try {
      const response = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'ChangeMe123!',
        }),
      });
      const body = (await response.json()) as {
        accessToken: string;
        user: { email: string };
      };

      expect(response.status).toBe(200);
      expect(body.accessToken).toBe('signed-jwt-token');
      expect(body.user.email).toBe('admin@example.com');
    } finally {
      await server.close();
    }
  });
});
