import { forwardRef, Module } from '@nestjs/common';
import { AdminSessionController } from './admin-session.controller';
import { AdminSessionGuard } from './admin-session.guard';
import { AdminSessionService } from './admin-session.service';
import { TeamAccessController } from './team-access.controller';
import { TeamAccessService } from './team-access.service';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';

@Module({
  imports: [forwardRef(() => OperationsAuditModule)],
  controllers: [AdminSessionController, TeamAccessController],
  providers: [AdminSessionService, AdminSessionGuard, TeamAccessService],
  exports: [AdminSessionService, AdminSessionGuard],
})
export class AdminModule {}
