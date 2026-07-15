import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OptionsQueryDto } from './dto/options-query.dto';
import { OptionResource, OptionsService } from './options.service';

@ApiTags('options')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Get(':resource/options')
  @Roles('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')
  find(
    @Param('resource', new ParseEnumPipe(OptionResource))
    resource: OptionResource,
    @Query() query: OptionsQueryDto,
  ) {
    return this.optionsService.find(resource, query);
  }
}
