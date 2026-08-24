import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { BusinessHoursModule } from '../business-hours/business-hours.module';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { AdminBookingsController } from './admin-bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingOperationsService } from './booking-operations.service';
import { PublicBookingsController } from './public-bookings.controller';
import { CustomerAccountModule } from '../customer-account/customer-account.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { PendingBookingExpiryService } from './pending-booking-expiry.service';
import { FormsModule } from '../forms/forms.module';

@Module({
  imports: [
    AvailabilityModule,
    BusinessHoursModule,
    AdminModule,
    NotificationsModule,
    OperationsAuditModule,
    CustomerAccountModule,
    SchedulingModule,
    FormsModule,
  ],
  controllers: [PublicBookingsController, AdminBookingsController],
  providers: [
    BookingsService,
    BookingOperationsService,
    PendingBookingExpiryService,
  ],
})
export class BookingsModule {}
