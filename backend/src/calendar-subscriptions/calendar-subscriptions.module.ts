import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { CalendarSubscriptionsController } from './calendar-subscriptions.controller';
import { CalendarSubscriptionsService } from './calendar-subscriptions.service';

@Module({
  imports: [AdminModule, OperationsAuditModule],
  controllers: [CalendarSubscriptionsController],
  providers: [CalendarSubscriptionsService],
})
export class CalendarSubscriptionsModule {}
