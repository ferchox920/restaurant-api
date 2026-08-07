import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from 'mercadopago';
import { MercadoPagoWebhookDto } from './dto/mercado-pago-webhook.dto';
import { MercadoPagoOrdersService } from './mercado-pago-orders.service';

@Injectable()
export class MercadoPagoWebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly ordersService: MercadoPagoOrdersService,
  ) {}

  async handleOrder(input: {
    xSignature?: string;
    xRequestId?: string;
    dataId?: string;
    body: MercadoPagoWebhookDto;
  }): Promise<{
    received: true;
    externalOrderId: string;
    status: string;
    reconciliationError: string | null;
  }> {
    const secret = this.config
      .get<string>('MERCADO_PAGO_WEBHOOK_SECRET')
      ?.trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        'Mercado Pago webhook is not configured.',
      );
    }
    if (!input.dataId || input.body.data.id !== input.dataId) {
      throw new BadRequestException(
        'Webhook data.id does not match the signed query parameter.',
      );
    }
    if (input.body.type !== 'order') {
      throw new BadRequestException(
        'Only Mercado Pago order events are accepted.',
      );
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: input.xSignature,
        xRequestId: input.xRequestId,
        dataId: input.dataId,
        secret,
        toleranceSeconds:
          this.config.get<number>('MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS') ??
          300,
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        throw new UnauthorizedException('Invalid Mercado Pago signature.');
      }
      throw error;
    }

    const order = await this.ordersService.refreshByExternalId(input.dataId);
    return {
      received: true,
      externalOrderId: order.externalOrderId,
      status: order.status,
      reconciliationError: order.reconciliationError,
    };
  }
}
