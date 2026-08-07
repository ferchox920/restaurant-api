import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { CreateMercadoPagoOrderDto } from './dto/create-mercado-pago-order.dto';
import { MercadoPagoOrderResponseDto } from './dto/mercado-pago-order-response.dto';
import { MercadoPagoOrdersService } from './mercado-pago-orders.service';

@ApiTags('integrations - mercado-pago')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/mercado-pago')
export class MercadoPagoOrdersController {
  constructor(
    private readonly ordersService: MercadoPagoOrdersService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post('tickets/:ticketId/orders')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Crear y procesar una Order online para un ticket',
    description:
      'El importe y los items se obtienen del ticket DRAFT. Requiere un CardToken de MercadoPago.js y el header Idempotency-Key.',
  })
  @ApiCreatedResponse({ type: MercadoPagoOrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Payload, ticketId o Idempotency-Key invalido.',
  })
  @ApiConflictResponse({
    description: 'El ticket no puede cobrarse o la clave fue reutilizada.',
  })
  @ApiBadGatewayResponse({ description: 'Mercado Pago rechazo la operacion.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({ description: 'Rol sin permiso para cobrar.' })
  create(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Body() dto: CreateMercadoPagoOrderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<MercadoPagoOrderResponseDto> {
    return this.idempotency.execute({
      key: idempotencyKey,
      userId: user.id,
      operation: `mercado-pago.order.create:${ticketId}`,
      body: dto,
      run: () =>
        this.ordersService.create(ticketId, dto, user.id, idempotencyKey),
    });
  }

  @Get('tickets/:ticketId/orders')
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  @ApiOperation({ summary: 'Listar Orders de Mercado Pago de un ticket' })
  @ApiOkResponse({ type: MercadoPagoOrderResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Ticket no encontrado.' })
  findByTicket(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
  ): Promise<MercadoPagoOrderResponseDto[]> {
    return this.ordersService.findByTicket(ticketId);
  }

  @Get('orders/:id')
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  @ApiOperation({ summary: 'Consultar una Order almacenada localmente' })
  @ApiOkResponse({ type: MercadoPagoOrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order no encontrada.' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MercadoPagoOrderResponseDto> {
    return this.ordersService.findOne(id);
  }

  @Post('orders/:id/refresh')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({
    summary: 'Refrescar y reconciliar una Order desde Mercado Pago',
  })
  @ApiOkResponse({ type: MercadoPagoOrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order no encontrada.' })
  @ApiBadGatewayResponse({ description: 'Mercado Pago no respondio.' })
  refresh(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MercadoPagoOrderResponseDto> {
    return this.ordersService.refresh(id);
  }
}
