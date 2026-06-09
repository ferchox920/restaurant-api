import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Endpoint base temporal de la API',
    description:
      'Endpoint tecnico temporal para verificar que la API principal responde. No representa una capacidad de negocio.',
  })
  @ApiOkResponse({
    description: 'Mensaje base de bootstrap de la API.',
    schema: {
      example: {
        message: 'Restaurat API base initialized',
      },
    },
  })
  getRoot(): { message: string } {
    return this.appService.getRootMessage();
  }
}
