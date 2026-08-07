import { Body, Controller, Headers, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MercadoPagoWebhookDto } from './dto/mercado-pago-webhook.dto';
import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';

@ApiTags('integrations - mercado-pago')
@Controller('integrations/mercado-pago/webhooks')
export class MercadoPagoWebhookController {
  constructor(private readonly webhookService: MercadoPagoWebhookService) {}

  @Post('orders')
  @ApiOperation({ summary: 'Recibir Webhooks firmados de Orders' })
  @ApiOkResponse({ description: 'Notificacion validada y procesada.' })
  @ApiBadRequestResponse({ description: 'Notificacion inconsistente.' })
  @ApiUnauthorizedResponse({ description: 'Firma invalida.' })
  @ApiServiceUnavailableResponse({ description: 'Webhook no configurado.' })
  handleOrder(
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Query('data.id') dataId: string | undefined,
    @Body() body: MercadoPagoWebhookDto,
  ) {
    return this.webhookService.handleOrder({
      xSignature,
      xRequestId,
      dataId,
      body,
    });
  }
}
