import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingPolicyModule } from '../booking-policy/booking-policy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { BookingChangeRequestsController } from './booking-change-requests.controller';
import { BookingChangeRequestsService } from './booking-change-requests.service';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [
    AdminModule,
    AvailabilityModule,
    BookingPolicyModule,
    NotificationsModule,
    OperationsAuditModule,
    SchedulingModule,
  ],
  controllers: [BookingChangeRequestsController],
  providers: [BookingChangeRequestsService],
  exports: [BookingChangeRequestsService],
})
export class BookingChangesModule {}
