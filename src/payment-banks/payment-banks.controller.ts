import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivePaginationQueryDto } from '../common/dto/active-pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreatePaymentBankDto } from './dto/create-payment-bank.dto';
import { PaymentBankResponseDto } from './dto/payment-bank-response.dto';
import { UpdatePaymentBankDto } from './dto/update-payment-bank.dto';
import { PaymentBanksService } from './payment-banks.service';

@ApiTags('payment-banks')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-banks')
export class PaymentBanksController {
  constructor(private readonly paymentBanksService: PaymentBanksService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Crear banco de transferencia',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden crear bancos habilitados para pagos por transferencia.',
  })
  @ApiCreatedResponse({
    description: 'Banco creado correctamente.',
    type: PaymentBankResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  @ApiConflictResponse({
    description: 'Ya existe un banco con el nombre informado.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos de escritura.',
  })
  create(
    @Body() dto: CreatePaymentBankDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentBankResponseDto> {
    return this.paymentBanksService.create(dto, user.id);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'AUDITOR', 'CASHIER')
  @ApiOperation({
    summary: 'Listar bancos de transferencia',
    description:
      'Requiere JWT. Permite consultar bancos activos o inactivos para asociarlos a pagos por transferencia.',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filtra por estado activo. Si no se envia, devuelve todos.',
  })
  @ApiOkResponse({
    description: 'Listado de bancos.',
    type: PaymentBankResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'El parametro active debe ser true o false si se envia.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos de lectura.',
  })
  findAll(
    @Query() query: ActivePaginationQueryDto,
  ): Promise<PaymentBankResponseDto[]> {
    return this.paymentBanksService.findAll(query.active, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR', 'CASHIER')
  @ApiOperation({
    summary: 'Obtener banco por id',
    description: 'Requiere JWT.',
  })
  @ApiOkResponse({
    description: 'Banco encontrado.',
    type: PaymentBankResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({ description: 'Banco no encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos de lectura.',
  })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PaymentBankResponseDto> {
    return this.paymentBanksService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Actualizar banco',
    description:
      'Requiere JWT. Solo ADMIN y MANAGER pueden editar bancos de transferencia.',
  })
  @ApiOkResponse({
    description: 'Banco actualizado correctamente.',
    type: PaymentBankResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload invalido o id no valido.' })
  @ApiNotFoundResponse({ description: 'Banco no encontrado.' })
  @ApiConflictResponse({
    description: 'Ya existe un banco con el nombre informado.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos de escritura.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePaymentBankDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentBankResponseDto> {
    return this.paymentBanksService.update(id, dto, user.id);
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Desactivar banco',
    description:
      'Requiere JWT. Un banco inactivo no puede usarse en nuevas ventas por transferencia.',
  })
  @ApiOkResponse({
    description: 'Banco desactivado correctamente.',
    type: PaymentBankResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({ description: 'Banco no encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos de escritura.',
  })
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentBankResponseDto> {
    return this.paymentBanksService.deactivate(id, user.id);
  }

  @Patch(':id/reactivate')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Reactivar banco',
    description: 'Requiere JWT.',
  })
  @ApiOkResponse({
    description: 'Banco reactivado correctamente.',
    type: PaymentBankResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({ description: 'Banco no encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente o invalido.' })
  @ApiForbiddenResponse({
    description: 'El usuario autenticado no tiene permisos de escritura.',
  })
  reactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentBankResponseDto> {
    return this.paymentBanksService.reactivate(id, user.id);
  }
}
