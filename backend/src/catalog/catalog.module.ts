import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminCatalogService } from './admin-catalog.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [AdminModule, OperationsAuditModule, SchedulingModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogService, AdminCatalogService],
})
export class CatalogModule {}
