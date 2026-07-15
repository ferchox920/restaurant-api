import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PosCatalogQueryDto } from './dto/pos-catalog-query.dto';
import { PosCatalogResponseDto } from './dto/pos-catalog-response.dto';
import { PosService } from './pos.service';

@ApiTags('pos')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('catalog')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOkResponse({ description: 'Catalogo POS compacto y paginado.' })
  getCatalog(
    @Query() query: PosCatalogQueryDto,
  ): Promise<PosCatalogResponseDto> {
    return this.posService.getCatalog(query);
  }
}
