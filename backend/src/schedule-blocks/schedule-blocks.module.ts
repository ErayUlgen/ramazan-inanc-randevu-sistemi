import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { BusinessHoursModule } from '../business-hours/business-hours.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { ScheduleBlocksController } from './schedule-blocks.controller';
import { ScheduleBlocksService } from './schedule-blocks.service';

@Module({
  imports: [AdminModule, BusinessHoursModule, OperationsAuditModule],
  controllers: [ScheduleBlocksController],
  providers: [ScheduleBlocksService],
  exports: [ScheduleBlocksService],
})
export class ScheduleBlocksModule {}
