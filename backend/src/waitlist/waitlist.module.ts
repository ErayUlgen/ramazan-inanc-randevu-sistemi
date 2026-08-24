import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingPolicyModule } from '../booking-policy/booking-policy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import {
  AdminWaitlistController,
  WaitlistController,
} from './waitlist.controller';
import { WaitlistWorkerService } from './waitlist-worker.service';
import { WaitlistService } from './waitlist.service';
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
  controllers: [WaitlistController, AdminWaitlistController],
  providers: [WaitlistService, WaitlistWorkerService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
