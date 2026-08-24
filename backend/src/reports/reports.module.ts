import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AvailabilityModule } from '../availability/availability.module';
import { CapacityCalculationService } from './capacity-calculation.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AdminModule, AvailabilityModule],
  controllers: [ReportsController],
  providers: [ReportsService, CapacityCalculationService],
})
export class ReportsModule {}
