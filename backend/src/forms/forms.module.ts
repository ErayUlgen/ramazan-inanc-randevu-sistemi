import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { CustomerAccountModule } from '../customer-account/customer-account.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { AdminFormsController } from './admin-forms.controller';
import { CustomerFormsController } from './customer-forms.controller';
import { FormsService } from './forms.service';

@Module({
  imports: [AdminModule, CustomerAccountModule, OperationsAuditModule],
  controllers: [AdminFormsController, CustomerFormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
