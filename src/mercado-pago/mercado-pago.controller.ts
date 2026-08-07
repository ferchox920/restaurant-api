import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  MercadoPagoPaymentsPageResponseDto,
  SyncMercadoPagoPaymentsResponseDto,
} from './dto/mercado-pago-payment-response.dto';
import { MercadoPagoPaymentsQueryDto } from './dto/mercado-pago-payments-query.dto';
import { SyncMercadoPagoPaymentsQueryDto } from './dto/sync-mercado-pago-payments-query.dto';
import { MercadoPagoService } from './mercado-pago.service';

@ApiTags('integrations - mercado-pago')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/mercado-pago/payments')
export class MercadoPagoController {
  constructor(private readonly mercadoPagoService: MercadoPagoService) {}

  @Post('sync')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Sincronizar cobros desde Mercado Pago',
    description:
      'Importa y actualiza de forma idempotente los pagos del rango solicitado. Si no se indican fechas, sincroniza los ultimos 30 dias.',
  })
  @ApiOkResponse({
    description: 'Sincronizacion completada.',
    type: SyncMercadoPagoPaymentsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Rango de fechas invalido.' })
  @ApiBadGatewayResponse({
    description: 'Mercado Pago no respondio o devolvio datos invalidos.',
  })
  @ApiServiceUnavailableResponse({
    description: 'La integracion esta deshabilitada o no configurada.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario no tiene permisos para sincronizar pagos.',
  })
  sync(
    @Query() query: SyncMercadoPagoPaymentsQueryDto,
  ): Promise<SyncMercadoPagoPaymentsResponseDto> {
    return this.mercadoPagoService.syncPayments(query);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  @ApiOperation({
    summary: 'Listar cobros sincronizados de Mercado Pago',
    description:
      'Consulta los movimientos almacenados localmente sin realizar llamadas a Mercado Pago.',
  })
  @ApiOkResponse({
    description: 'Pagina de cobros sincronizados.',
    type: MercadoPagoPaymentsPageResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Filtros invalidos.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario no tiene permisos para consultar pagos.',
  })
  findAll(
    @Query() query: MercadoPagoPaymentsQueryDto,
  ): Promise<MercadoPagoPaymentsPageResponseDto> {
    return this.mercadoPagoService.findAll(query);
  }
}
