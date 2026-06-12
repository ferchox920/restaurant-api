import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiMetadataResponse {
  service: string;
  version: string;
  status: string;
  docs: string;
  health: string;
  environment: string;
}

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getApiMetadata(): ApiMetadataResponse {
    return {
      service: 'restaurant-admin-api',
      version: '0.1.0',
      status: 'ok',
      docs: '/docs',
      health: '/health',
      environment: this.configService.getOrThrow<string>('NODE_ENV'),
    };
  }
}
