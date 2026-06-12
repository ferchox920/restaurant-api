import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiMetadataResponse, AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Metadata publica basica de la API',
    description:
      'Endpoint publico sin autenticacion para identificar el servicio, su version y rutas tecnicas basicas. No reemplaza el health check ni expone secretos.',
  })
  @ApiOkResponse({
    description: 'Metadata publica basica del servicio.',
    schema: {
      example: {
        service: 'restaurant-admin-api',
        version: '0.1.0',
        status: 'ok',
        docs: '/docs',
        health: '/health',
        environment: 'development',
      },
    },
  })
  getRoot(): ApiMetadataResponse {
    return this.appService.getApiMetadata();
  }
}
