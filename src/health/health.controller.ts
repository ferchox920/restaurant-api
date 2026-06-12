import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthReadinessResponse,
  HealthResponse,
  HealthService,
} from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check basico de la API' })
  @ApiOkResponse({
    description: 'La API respondio correctamente.',
    schema: {
      example: {
        status: 'ok',
        service: 'restaurant-admin-api',
        timestamp: '2026-06-08T11:20:31.000Z',
        environment: 'development',
      },
    },
  })
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness check con verificacion de base de datos' })
  @ApiOkResponse({
    description: 'La API y la base de datos estan listas para recibir trafico.',
    schema: {
      example: {
        status: 'ok',
        database: 'ok',
        timestamp: '2026-06-10T11:20:31.000Z',
      },
    },
  })
  getReadiness(): Promise<HealthReadinessResponse> {
    return this.healthService.getReadiness();
  }
}
