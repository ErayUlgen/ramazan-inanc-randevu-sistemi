import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { BusinessHoursModule } from '../business-hours/business-hours.module';
import { AdminAvailabilityController } from './admin-availability.controller';
import { AvailabilityController } from './availability.controller';
import { AvailabilityEngine } from './availability.engine';
import { AvailabilityService } from './availability.service';
import { ScheduleValidationService } from './schedule-validation.service';
import { ProfessionalAvailabilityService } from './professional-availability.service';
import { BookingPolicyModule } from '../booking-policy/booking-policy.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [
    AdminModule,
    BusinessHoursModule,
    BookingPolicyModule,
    SchedulingModule,
  ],
  controllers: [AvailabilityController, AdminAvailabilityController],
  providers: [
    AvailabilityEngine,
    AvailabilityService,
    ScheduleValidationService,
    ProfessionalAvailabilityService,
  ],
  exports: [
    AvailabilityService,
    ScheduleValidationService,
    ProfessionalAvailabilityService,
  ],
})
export class AvailabilityModule {}
