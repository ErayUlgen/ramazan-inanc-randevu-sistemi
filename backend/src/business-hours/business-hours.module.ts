import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { BusinessHoursController } from './business-hours.controller';
import { BusinessHoursService } from './business-hours.service';

@Module({
  imports: [AdminModule, OperationsAuditModule],
  controllers: [BusinessHoursController],
  providers: [BusinessHoursService],
  exports: [BusinessHoursService],
})
export class BusinessHoursModule {}
