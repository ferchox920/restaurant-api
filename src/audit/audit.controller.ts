import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

@ApiTags('audit-logs')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.AUDITOR)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar logs de auditoria',
    description:
      'Requiere JWT. Solo ADMIN y AUDITOR pueden consultar la auditoria general.',
  })
  @ApiOkResponse({
    description: 'Listado de logs de auditoria.',
    type: AuditLogResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Filtros de consulta invalidos.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar auditoria.',
  })
  findAll(@Query() query: AuditLogQueryDto): Promise<AuditLogResponseDto[]> {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener log de auditoria por id',
    description:
      'Requiere JWT. Solo ADMIN y AUDITOR pueden consultar un log individual.',
  })
  @ApiOkResponse({
    description: 'Log de auditoria encontrado.',
    type: AuditLogResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El id informado no es un UUID valido.',
  })
  @ApiNotFoundResponse({
    description: 'Log de auditoria no encontrado.',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente o invalido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario autenticado no tiene permisos para consultar auditoria.',
  })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AuditLogResponseDto> {
    return this.auditService.findOne(id);
  }
}
