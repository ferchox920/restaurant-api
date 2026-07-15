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
  connections?: { active: number; waiting: number };
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
      const connections = await this.prismaService.$queryRaw<
        Array<{ active: bigint; waiting: bigint }>
      >`SELECT
          COUNT(*) FILTER (WHERE state = 'active')::bigint AS active,
          COUNT(*) FILTER (WHERE wait_event IS NOT NULL)::bigint AS waiting
        FROM pg_stat_activity
        WHERE datname = current_database()`;

      const poolMetrics = connections[0];
      return {
        status: 'ok',
        database: 'ok',
        timestamp: new Date().toISOString(),
        ...(poolMetrics?.active !== undefined &&
        poolMetrics.waiting !== undefined
          ? {
              connections: {
                active: Number(poolMetrics.active),
                waiting: Number(poolMetrics.waiting),
              },
            }
          : {}),
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
