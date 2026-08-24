import { forwardRef, Module } from '@nestjs/common';
import { OperationsAuditService } from './operations-audit.service';
import { AdminModule } from '../admin/admin.module';
import { OperationsAuditController } from './operations-audit.controller';

@Module({
  imports: [forwardRef(() => AdminModule)],
  controllers: [OperationsAuditController],
  providers: [OperationsAuditService],
  exports: [OperationsAuditService],
})
export class OperationsAuditModule {}
