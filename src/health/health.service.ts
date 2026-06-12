import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  environment: string;
}

export interface HealthReadinessResponse {
  status: string;
  database: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'restaurant-admin-api',
      timestamp: new Date().toISOString(),
      environment: this.configService.getOrThrow<string>('NODE_ENV'),
    };
  }

  async getReadiness(): Promise<HealthReadinessResponse> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        database: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
