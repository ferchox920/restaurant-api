import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MercadoPagoOrderPreviewResponseDto } from './dto/mercado-pago-order-preview-response.dto';
import { MercadoPagoOrderPreviewService } from './mercado-pago-order-preview.service';

@ApiTags('integrations - mercado-pago')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/mercado-pago/tickets')
export class MercadoPagoOrderPreviewController {
  constructor(
    private readonly orderPreviewService: MercadoPagoOrderPreviewService,
  ) {}

  @Get(':ticketId/order-preview')
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  @ApiOperation({
    summary: 'Previsualizar productos de un ticket para Mercado Pago Orders',
    description:
      'Transforma los snapshots de un ticket DRAFT en el payload base de una Order online. No crea registros ni llama a Mercado Pago.',
  })
  @ApiOkResponse({
    description: 'Payload base de Mercado Pago generado correctamente.',
    type: MercadoPagoOrderPreviewResponseDto,
  })
  @ApiBadRequestResponse({ description: 'El ticketId no es un UUID valido.' })
  @ApiNotFoundResponse({ description: 'Ticket no encontrado.' })
  @ApiConflictResponse({
    description:
      'El ticket no es DRAFT, esta vacio o sus importes no pueden representarse como items.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario no tiene permisos para consultar el ticket.',
  })
  preview(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
  ): Promise<MercadoPagoOrderPreviewResponseDto> {
    return this.orderPreviewService.preview(ticketId);
  }
}
