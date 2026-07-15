import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PerformanceMetricsService } from './performance-metrics.service';

@Controller('metrics/performance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformanceMetricsController {
  constructor(private readonly metrics: PerformanceMetricsService) {}

  @Get()
  @Roles('ADMIN', 'AUDITOR')
  snapshot() {
    return { routes: this.metrics.snapshot() };
  }
}
