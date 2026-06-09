import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getHealth(): {
    status: string;
    service: string;
    timestamp: string;
    environment: string;
  } {
    return {
      status: 'ok',
      service: 'restaurant-admin-api',
      timestamp: new Date().toISOString(),
      environment: this.configService.getOrThrow<string>('NODE_ENV'),
    };
  }
}
