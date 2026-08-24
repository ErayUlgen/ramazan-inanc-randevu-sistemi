import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerMemoryController } from './customer-memory.controller';
import { CustomerMemoryService } from './customer-memory.service';

@Module({
  imports: [AdminModule, OperationsAuditModule],
  controllers: [CustomersController, CustomerMemoryController],
  providers: [CustomersService, CustomerMemoryService],
  exports: [CustomerMemoryService],
})
export class CustomersModule {}
