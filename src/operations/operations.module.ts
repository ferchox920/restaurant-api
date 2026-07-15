import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CookieAuthGuard } from './cookie-auth.guard';
import { OperationsEventsController } from './operations-events.controller';
import { OperationsEventsService } from './operations-events.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OperationsEventsController],
  providers: [OperationsEventsService, CookieAuthGuard],
})
export class OperationsModule {}
