import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

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
  getHealth(): {
    status: string;
    service: string;
    timestamp: string;
    environment: string;
  } {
    return this.healthService.getHealth();
  }
}
