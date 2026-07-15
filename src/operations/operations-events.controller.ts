import { Controller, Get, Headers, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CookieAuthGuard } from './cookie-auth.guard';
import { OperationsEventsService } from './operations-events.service';

@Controller('operations')
export class OperationsEventsController {
  constructor(private readonly events: OperationsEventsService) {}

  @Get('events')
  @UseGuards(JwtAuthGuard, CookieAuthGuard)
  stream(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('last-event-id') lastEventId: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const parsed = /^\d+$/.test(lastEventId ?? '') ? BigInt(lastEventId!) : 0n;
    return this.events.connect(user.id, parsed, response);
  }
}
