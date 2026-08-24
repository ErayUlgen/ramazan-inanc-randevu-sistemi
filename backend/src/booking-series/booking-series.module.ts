import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingPolicyModule } from '../booking-policy/booking-policy.module';
import { CustomerAccountModule } from '../customer-account/customer-account.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import {
  AdminBookingSeriesController,
  CustomerBookingSeriesController,
} from './booking-series.controller';
import { BookingSeriesService } from './booking-series.service';

@Module({
  imports: [
    AdminModule,
    AvailabilityModule,
    BookingPolicyModule,
    CustomerAccountModule,
    NotificationsModule,
    OperationsAuditModule,
    SchedulingModule,
  ],
  controllers: [CustomerBookingSeriesController, AdminBookingSeriesController],
  providers: [BookingSeriesService],
})
export class BookingSeriesModule {}
